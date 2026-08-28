import json
import os
import smtplib
import socket
import ssl
import time
import concurrent.futures
import urllib.error
import urllib.parse
import urllib.request
import base64
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from models import Setting

SMTP_SOCKET_TIMEOUT_SEC = 8
SMTP_HARD_TIMEOUT_SEC = 12
GMAIL_OAUTH_HOST = "oauth2.googleapis.com"
GMAIL_API_HOST = "gmail.googleapis.com"
MAILTRAP_API_HOST = "send.api.mailtrap.io"


def _read_setting(db: Session, key: str, default: str = "") -> str:
    row = db.query(Setting).filter(Setting.key == key).first()
    if not row or not row.value:
        return default
    try:
        parsed = json.loads(row.value)
        if isinstance(parsed, str):
            return parsed
        return str(parsed)
    except Exception:
        return str(row.value)


def load_smtp_config(db: Session, overrides: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    overrides = overrides or {}

    if "smtpEnabled" in overrides and overrides["smtpEnabled"] is not None:
        enabled = bool(overrides["smtpEnabled"])
    else:
        enabled_raw = _read_setting(db, "smtpEnabled", os.getenv("SMTP_ENABLED", "false"))
        enabled = (
            str(enabled_raw).lower() in ("true", "1", "yes")
            or bool(os.getenv("SMTP_HOST", "").strip())
            or is_gmail_api_configured()
            or bool(os.getenv("MAILTRAP_API_TOKEN", "").strip())
        )

    host = overrides.get("smtpHost")
    if host is None or (isinstance(host, str) and not host.strip()):
        host = _read_setting(db, "smtpHost", os.getenv("SMTP_HOST", ""))

    port_raw = overrides.get("smtpPort")
    if port_raw is None:
        port_raw = _read_setting(db, "smtpPort", os.getenv("SMTP_PORT", "587"))
    port = int(port_raw or 587)

    user = overrides.get("smtpUser")
    if user is None or (isinstance(user, str) and not user.strip()):
        user = _read_setting(db, "smtpUser", os.getenv("SMTP_USER", ""))

    password = overrides.get("smtpPassword")
    if password is None or (isinstance(password, str) and not password.strip()):
        password = _read_setting(db, "smtpPassword", os.getenv("SMTP_PASSWORD", ""))
    password = str(password or "").strip()
    user_str = str(user or "").strip()
    host_str = _normalize_smtp_host(str(host or ""))
    if not password and user_str.lower() == "api":
        password = os.getenv("MAILTRAP_API_TOKEN", "").strip()
    if not password and is_gmail_host(host_str):
        password = os.getenv("GMAIL_APP_PASSWORD", os.getenv("SMTP_PASSWORD", "")).strip()

    from_addr = overrides.get("smtpFrom")
    if from_addr is None or (isinstance(from_addr, str) and not from_addr.strip()):
        from_addr = _read_setting(
            db,
            "smtpFrom",
            os.getenv("SMTP_FROM", _read_setting(db, "contactEmail", "contact@kswstudio.fr")),
        )

    return {
        "enabled": enabled,
        "host": _normalize_smtp_host(str(host or "")),
        "port": port,
        "user": str(user or "").strip(),
        "password": password,
        "from_addr": str(from_addr or "").strip(),
        "use_tls": str(_read_setting(db, "smtpUseTls", os.getenv("SMTP_USE_TLS", "true"))).lower()
        not in ("false", "0", "no"),
    }


def is_mailtrap_sandbox_host(host: str) -> bool:
    return "sandbox.smtp.mailtrap.io" in _normalize_smtp_host(host).lower()


def is_mailtrap_live_host(host: str) -> bool:
    h = _normalize_smtp_host(host).lower()
    return "live.smtp.mailtrap.io" in h or "bulk.smtp.mailtrap.io" in h


def is_gmail_host(host: str) -> bool:
    return "gmail.com" in _normalize_smtp_host(host).lower() or "googlemail.com" in _normalize_smtp_host(host).lower()


def _is_dns_resolution_error(error: Optional[str]) -> bool:
    if not error:
        return False
    lowered = error.lower()
    markers = (
        "no address associated with hostname",
        "getaddrinfo failed",
        "name or service not known",
        "nodename nor servname provided",
        "temporary failure in name resolution",
        "errno -5",
        "errno -2",
        "errno -3",
    )
    return any(marker in lowered for marker in markers)


def _is_gmail_oauth_failure(error: Optional[str]) -> bool:
    if not error:
        return False
    lowered = error.lower()
    markers = (
        "invalid_grant",
        "refresh token",
        "révoqué",
        "revoked",
        "expiré",
        "expired",
        "token gmail api invalide",
        "oauth google",
    )
    return any(marker in lowered for marker in markers)


def _should_try_mailtrap_fallback(error: Optional[str]) -> bool:
    if _email_provider_preference() == "gmail":
        return False
    return _is_dns_resolution_error(error) or _is_gmail_oauth_failure(error)


def _resolve_host(host: str) -> Optional[str]:
    cleaned = _normalize_smtp_host(host)
    if not cleaned:
        return None
    try:
        return socket.gethostbyname(cleaned)
    except OSError:
        return None


def _oauth_dns_help_message() -> str:
    return (
        "Le serveur ne peut pas résoudre oauth2.googleapis.com (DNS). "
        "Causes fréquentes : réseau local (FAI, connexion instable), DNS Docker défaillant, ou blocage Google.\n"
        "Actions : (1) redémarrez le backend : docker compose up -d --force-recreate backend ; "
        "(2) consultez GET /api/v1/admin/email/connectivity ; "
        "(3) utilisez « Mailtrap production » dans Paramètres → Sécurité (HTTPS, sans Google) ; "
        "(4) ou testez depuis un VPN / réseau 4G."
    )


def _mailtrap_live_token() -> str:
    return os.getenv("MAILTRAP_API_TOKEN", "").strip()


def _mailtrap_sandbox_token() -> str:
    return os.getenv("MAILTRAP_SANDBOX_API_TOKEN", "").strip() or _mailtrap_live_token()


def _email_provider_preference() -> str:
    return os.getenv("EMAIL_PROVIDER", "").strip().lower()


def probe_mailtrap_sending_token(token: Optional[str] = None) -> Dict[str, Any]:
    """Vérifie si le token Mailtrap autorise l'envoi transactionnel (send.api.mailtrap.io)."""
    tok = (token or _mailtrap_live_token()).strip()
    if not tok:
        return {
            "configured": False,
            "sending_ready": False,
            "error": "MAILTRAP_API_TOKEN manquant dans .env",
        }

    payload = json.dumps({"from": {"email": "probe@example.com"}, "to": [], "subject": "probe"}).encode("utf-8")
    request = urllib.request.Request(
        "https://send.api.mailtrap.io/api/send",
        data=payload,
        headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            return {"configured": True, "sending_ready": 200 <= response.status < 300, "http_status": response.status}
    except urllib.error.HTTPError as exc:
        if exc.code == 403:
            return {
                "configured": True,
                "sending_ready": False,
                "http_status": 403,
                "error": "Token sans permission « Email Sending » — recréez-le sur mailtrap.io/api-tokens",
            }
        if exc.code == 401:
            return {
                "configured": True,
                "sending_ready": False,
                "http_status": 401,
                "error": "Token Mailtrap invalide ou expiré (401)",
            }
        if exc.code == 422:
            return {"configured": True, "sending_ready": True, "http_status": 422}
        body = exc.read().decode("utf-8", errors="replace")
        return {
            "configured": True,
            "sending_ready": False,
            "http_status": exc.code,
            "error": body[:240] or f"Erreur Mailtrap HTTP {exc.code}",
        }
    except urllib.error.URLError as exc:
        return {"configured": True, "sending_ready": False, "error": f"Réseau : {exc.reason}"}


def _build_mailtrap_fallback_cfg(db: Session, cfg: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    token = _mailtrap_live_token()
    if not token:
        return None

    from_addr = str(cfg.get("from_addr") or "").strip()
    if not from_addr or "mailtrap.io" in from_addr.lower():
        from_addr = _read_setting(db, "contactEmail", "contact@kswstudio.fr") or str(cfg.get("user") or "").strip()
    if not from_addr or "mailtrap.io" in from_addr.lower():
        return None

    return {
        "enabled": True,
        "host": "live.smtp.mailtrap.io",
        "port": 2525,
        "user": "api",
        "password": token,
        "from_addr": from_addr,
        "use_tls": True,
    }


def check_email_connectivity() -> Dict[str, Any]:
    targets = [
        (GMAIL_OAUTH_HOST, 443),
        (GMAIL_API_HOST, 443),
        (MAILTRAP_API_HOST, 443),
    ]
    resolved_targets: list[Dict[str, Any]] = []
    for host, port in targets:
        ip = _resolve_host(host)
        resolved_targets.append(
            {
                "host": host,
                "port": port,
                "resolved_ip": ip,
                "ok": bool(ip),
            }
        )

    return {
        "running_in_docker": os.getenv("RUNNING_IN_DOCKER", "").lower() in ("true", "1", "yes"),
        "email_provider": _email_provider_preference() or None,
        "gmail_api_configured": is_gmail_api_configured(),
        "mailtrap_token_present": bool(_mailtrap_live_token()),
        "mailtrap_sandbox_id_present": bool(os.getenv("MAILTRAP_SANDBOX_ID", "").strip()),
        "mailtrap_sending": probe_mailtrap_sending_token(),
        "targets": resolved_targets,
        "all_ok": all(item["ok"] for item in resolved_targets),
    }


def _gmail_api_credentials() -> Optional[Dict[str, str]]:
    client_id = os.getenv("GMAIL_CLIENT_ID", "").strip()
    client_secret = os.getenv("GMAIL_CLIENT_SECRET", "").strip()
    refresh_token = os.getenv("GMAIL_REFRESH_TOKEN", "").strip()
    if client_id and client_secret and refresh_token:
        return {
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token,
        }
    return None


def is_gmail_api_configured() -> bool:
    return _gmail_api_credentials() is not None


def gmail_api_missing_keys() -> list[str]:
    labels = {
        "GMAIL_CLIENT_ID": "GMAIL_CLIENT_ID",
        "GMAIL_CLIENT_SECRET": "GMAIL_CLIENT_SECRET",
        "GMAIL_REFRESH_TOKEN": "GMAIL_REFRESH_TOKEN",
    }
    missing: list[str] = []
    creds = _gmail_api_credentials()
    if creds:
        return missing
    for env_key, label in labels.items():
        if not os.getenv(env_key, "").strip():
            missing.append(label)
    return missing


def _apply_mailtrap_primary_settings(db: Session) -> bool:
    token = _mailtrap_live_token()
    if not token:
        return False

    contact = _read_setting(db, "contactEmail", "contact@kswstudio.fr") or "contact@kswstudio.fr"
    from_addr = os.getenv("SMTP_FROM", contact).strip() or contact
    if (
        "mailtrap.io" in from_addr.lower()
        or from_addr.endswith("@demomailtrap.co")
        or from_addr.endswith("@gmail.com")
    ):
        from_addr = contact

    patches = {
        "smtpEnabled": True,
        "smtpHost": "live.smtp.mailtrap.io",
        "smtpPort": 2525,
        "smtpUser": "api",
        "smtpFrom": from_addr,
        "gmailUseApi": False,
        "smtpPasswordConfigured": True,
    }
    for key, val in patches.items():
        existing = db.query(Setting).filter(Setting.key == key).first()
        val_str = json.dumps(val)
        if existing:
            existing.value = val_str
        else:
            db.add(Setting(key=key, value=val_str))
    db.commit()
    print(f"[EMAIL] Envoi basculé sur Mailtrap (expéditeur {from_addr})")
    return True


def _apply_gmail_primary_settings(db: Session, *, use_api: bool = True) -> bool:
    user = os.getenv("SMTP_USER", "").strip() or "magickasai@gmail.com"
    from_addr = os.getenv("SMTP_FROM", user).strip() or user
    configured = bool(
        os.getenv("GMAIL_REFRESH_TOKEN", "").strip()
        or os.getenv("GMAIL_APP_PASSWORD", "").strip()
        or os.getenv("SMTP_PASSWORD", "").strip()
    )
    if not configured and not is_gmail_api_configured():
        return False

    patches = {
        "smtpEnabled": True,
        "smtpHost": "smtp.gmail.com",
        "smtpPort": 587,
        "smtpUser": user,
        "smtpFrom": from_addr,
        "gmailUseApi": use_api,
        "smtpPasswordConfigured": configured or is_gmail_api_configured(),
    }
    for key, val in patches.items():
        existing = db.query(Setting).filter(Setting.key == key).first()
        val_str = json.dumps(val)
        if existing:
            existing.value = val_str
        else:
            db.add(Setting(key=key, value=val_str))
    db.commit()
    mode = "API HTTPS" if use_api else "SMTP"
    print(f"[EMAIL] Envoi configuré sur Gmail ({mode}) — expéditeur {from_addr}")
    return True


def ensure_email_provider(db: Session) -> None:
    """Configure Gmail ou Mailtrap selon .env (EMAIL_PROVIDER) et disponibilité."""
    mailtrap_token = _mailtrap_live_token()
    provider = _email_provider_preference()
    creds = _gmail_api_credentials()
    use_gmail_api = os.getenv("GMAIL_USE_API", "").lower() in ("true", "1", "yes")
    gmail_only = provider == "gmail"

    if provider == "mailtrap" and mailtrap_token:
        _apply_mailtrap_primary_settings(db)
        probe = probe_mailtrap_sending_token()
        if not probe.get("sending_ready"):
            print(f"[EMAIL] Mailtrap actif mais envoi réel indisponible : {probe.get('error', 'token invalide')}")
        return

    if creds and use_gmail_api:
        _, err = _fetch_gmail_access_token(creds)
        if not err:
            _apply_gmail_primary_settings(db, use_api=True)
            return
        if err and _is_gmail_oauth_failure(err):
            print(f"[EMAIL] Gmail OAuth invalide : {str(err)[:180]}")
            app_password = os.getenv("GMAIL_APP_PASSWORD", os.getenv("SMTP_PASSWORD", "")).strip()
            if app_password and os.getenv("SMTP_USER", "").strip():
                print("[EMAIL] Bascule Gmail SMTP (mot de passe d'application).")
                _apply_gmail_primary_settings(db, use_api=False)
                return
            if gmail_only or not mailtrap_token:
                print(
                    "[EMAIL] Regénérez Gmail OAuth :\n"
                    "  python3 backend/scripts/gmail_oauth_setup.py\n"
                    "  puis mettez à jour GMAIL_REFRESH_TOKEN dans .env et redémarrez le backend."
                )
                _apply_gmail_primary_settings(db, use_api=True)
                return
            if _apply_mailtrap_primary_settings(db):
                print("[EMAIL] Gmail indisponible — fallback temporaire sur Mailtrap.")
                return
            print(
                "[EMAIL] Regénérez Gmail : python3 backend/scripts/gmail_oauth_setup.py "
                "ou ajoutez GMAIL_APP_PASSWORD dans .env"
            )
            _apply_gmail_primary_settings(db, use_api=True)
            return
        if err:
            print(f"[EMAIL] Avertissement Gmail : {str(err)[:200]}")
        _apply_gmail_primary_settings(db, use_api=True)
        return

    if use_gmail_api or gmail_only or is_gmail_api_configured():
        _apply_gmail_primary_settings(db, use_api=use_gmail_api)
        return

    if mailtrap_token and provider != "gmail":
        _apply_mailtrap_primary_settings(db)


def _gmail_missing_api_message() -> str:
    missing = gmail_api_missing_keys()
    missing_line = (
        f"Il manque dans .env : {', '.join(missing)}."
        if missing
        else "Identifiants Gmail API incomplets dans .env."
    )
    return (
        "Les ports SMTP Gmail (587/465) sont bloqués sur votre réseau — l'API Gmail (HTTPS) est requise.\n"
        f"{missing_line}\n"
        "Étapes : (1) Google Cloud → client OAuth « Application de bureau » ; "
        "(2) Écran de consentement → ajoutez magickasai@gmail.com en utilisateur test ; "
        "(3) Lancez : python3 backend/scripts/gmail_oauth_setup.py ; "
        "(4) Collez CLIENT_ID, CLIENT_SECRET et REFRESH_TOKEN dans .env ; "
        "(5) docker compose up -d backend"
    )


def _gmail_api_preferred(db: Session, cfg: Dict[str, Any], overrides: Optional[Dict[str, Any]] = None) -> bool:
    if not is_gmail_host(str(cfg.get("host") or "")):
        return False
    if os.getenv("GMAIL_USE_API", "").lower() in ("true", "1", "yes"):
        return True
    overrides = overrides or {}
    if overrides.get("gmailUseApi") is not None:
        return bool(overrides["gmailUseApi"])
    raw = _read_setting(db, "gmailUseApi", "true")
    return str(raw).lower() in ("true", "1", "yes")


def _should_use_gmail_api_only(db: Session, cfg: Dict[str, Any], overrides: Optional[Dict[str, Any]] = None) -> bool:
    if not is_gmail_host(str(cfg.get("host") or "")):
        return False
    return _gmail_api_preferred(db, cfg, overrides)


def _fetch_gmail_access_token_once(creds: Dict[str, str]) -> tuple[Optional[str], Optional[str]]:
    if not _resolve_host(GMAIL_OAUTH_HOST):
        return None, (
            f"Impossible de joindre {GMAIL_OAUTH_HOST} (HTTPS) : résolution DNS échouée.\n"
            f"{_oauth_dns_help_message()}"
        )

    data = urllib.parse.urlencode(
        {
            "client_id": creds["client_id"],
            "client_secret": creds["client_secret"],
            "refresh_token": creds["refresh_token"],
            "grant_type": "refresh_token",
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        f"https://{GMAIL_OAUTH_HOST}/token",
        data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            body = json.loads(response.read().decode("utf-8"))
            token = body.get("access_token")
            if token:
                return str(token), None
            return None, "Réponse OAuth Google sans access_token."
    except urllib.error.HTTPError as exc:
        err_body = exc.read().decode("utf-8", errors="replace")
        if exc.code == 400 and "invalid_grant" in err_body.lower():
            return None, (
                "Refresh token Gmail expiré ou révoqué. Regénérez-le via OAuth Playground "
                "(scope https://mail.google.com/) et mettez à jour GMAIL_REFRESH_TOKEN."
            )
        return None, f"OAuth Google (HTTP {exc.code}) : {err_body[:240]}"
    except urllib.error.URLError as exc:
        reason = str(exc.reason)
        if _is_dns_resolution_error(reason):
            return None, (
                f"Impossible de joindre {GMAIL_OAUTH_HOST} (HTTPS) : {reason}\n"
                f"{_oauth_dns_help_message()}"
            )
        return None, f"Impossible de joindre {GMAIL_OAUTH_HOST} (HTTPS) : {reason}"


def _fetch_gmail_access_token(creds: Dict[str, str]) -> tuple[Optional[str], Optional[str]]:
    last_err: Optional[str] = None
    for attempt in range(3):
        token, err = _fetch_gmail_access_token_once(creds)
        if token:
            return token, None
        last_err = err
        if not _is_dns_resolution_error(err) or attempt >= 2:
            break
        time.sleep(0.6 * (attempt + 1))
    return None, last_err


def _deliver_gmail_api_message(
    creds: Dict[str, str],
    msg: MIMEMultipart,
) -> tuple[bool, Optional[str]]:
    access_token, token_err = _fetch_gmail_access_token(creds)
    if token_err:
        return False, token_err

    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode("ascii")
    payload = json.dumps({"raw": raw}).encode("utf-8")
    request = urllib.request.Request(
        f"https://{GMAIL_API_HOST}/gmail/v1/users/me/messages/send",
        data=payload,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            if 200 <= response.status < 300:
                return True, None
            body = response.read().decode("utf-8", errors="replace")
            return False, body or f"Erreur Gmail API (HTTP {response.status})."
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        if exc.code == 401:
            return False, "Token Gmail API invalide — vérifiez GMAIL_REFRESH_TOKEN."
        if exc.code == 403:
            return False, (
                "Gmail API refusée (403). Activez l'API Gmail dans Google Cloud et autorisez le scope "
                "https://mail.google.com/ pour magickasai@gmail.com."
            )
        return False, body or f"Erreur Gmail API (HTTP {exc.code})."
    except urllib.error.URLError as exc:
        reason = str(exc.reason)
        if _is_dns_resolution_error(reason):
            return False, (
                f"Impossible de joindre {GMAIL_API_HOST} (HTTPS) : {reason}\n"
                f"{_oauth_dns_help_message()}"
            )
        return False, f"Impossible de joindre {GMAIL_API_HOST} (HTTPS) : {reason}"


def _deliver_mailtrap_sandbox_api_message(
    to_clean: str,
    subject: str,
    html_body: str,
    text_body: str,
) -> tuple[bool, Optional[str]]:
    """Envoi vers l'inbox Mailtrap Sandbox (test) — ne livre pas chez le vrai destinataire."""
    token = _mailtrap_sandbox_token()
    sandbox_id = os.getenv("MAILTRAP_SANDBOX_ID", "").strip()
    if not token:
        return False, "MAILTRAP_SANDBOX_API_TOKEN ou MAILTRAP_API_TOKEN manquant."
    if not sandbox_id:
        return False, "MAILTRAP_SANDBOX_ID manquant (Mailtrap → Email Testing → inbox → ID dans l'URL)."

    from_email = os.getenv("SMTP_FROM", "contact@kswstudio.fr").strip() or "contact@kswstudio.fr"
    if "mailtrap.io" in from_email.lower():
        from_email = "contact@kswstudio.fr"

    payload = {
        "from": {"email": from_email, "name": "KSW Studio"},
        "to": [{"email": to_clean}],
        "subject": subject,
        "html": html_body,
        "text": text_body,
    }
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        f"https://sandbox.api.mailtrap.io/api/send/{sandbox_id}",
        data=data,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            if 200 <= response.status < 300:
                return True, None
            body = response.read().decode("utf-8", errors="replace")
            return False, body or f"Erreur Mailtrap Sandbox (HTTP {response.status})."
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        if exc.code == 401:
            return False, "Token Mailtrap invalide pour le sandbox (401)."
        if exc.code == 403:
            return False, "Token Mailtrap sans accès sandbox — vérifiez les permissions du token."
        return False, body or f"Erreur Mailtrap Sandbox (HTTP {exc.code})."
    except urllib.error.URLError as exc:
        return False, f"Impossible de joindre sandbox.api.mailtrap.io : {exc.reason}"


def _try_mailtrap_fallback_delivery(
    db: Session,
    cfg: Dict[str, Any],
    to_clean: str,
    subject: str,
    html_body: str,
    text: str,
    *,
    hard_timeout_sec: Optional[int] = None,
    primary_error: Optional[str] = None,
) -> tuple[bool, Optional[str]]:
    fallback_cfg = _build_mailtrap_fallback_cfg(db, cfg)
    if not fallback_cfg:
        hint = _oauth_dns_help_message()
        if primary_error:
            return False, f"{primary_error}\n\n{hint}"
        return False, hint

    api_ok, api_err = _run_mailtrap_api_delivery(
        fallback_cfg,
        to_clean,
        subject,
        html_body,
        text,
        hard_timeout_sec=hard_timeout_sec,
    )
    if api_ok:
        return True, None

    if api_err and ("permission sending" in api_err.lower() or "403" in api_err):
        sandbox_ok, sandbox_err = _deliver_mailtrap_sandbox_api_message(
            to_clean, subject, html_body, text
        )
        if sandbox_ok:
            if is_development():
                print(
                    f"[EMAIL SANDBOX] Code 2FA capturé dans Mailtrap Sandbox "
                    f"(inbox {os.getenv('MAILTRAP_SANDBOX_ID', '?')}) — pas de livraison réelle."
                )
            return True, None
        if sandbox_err:
            api_err = f"{api_err} — Sandbox : {sandbox_err}"

    prefix = f"{primary_error}\n\n" if primary_error else ""
    return False, (
        f"{prefix}Gmail indisponible — fallback Mailtrap échoué : {api_err}"
    )

def _run_gmail_api_delivery(
    creds: Dict[str, str],
    msg: MIMEMultipart,
    *,
    hard_timeout_sec: Optional[int] = None,
) -> tuple[bool, Optional[str]]:
    timeout = hard_timeout_sec or SMTP_HARD_TIMEOUT_SEC
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(_deliver_gmail_api_message, creds, msg)
        try:
            return future.result(timeout=timeout)
        except concurrent.futures.TimeoutError:
            return False, "Délai dépassé en appel à l'API Gmail (gmail.googleapis.com)."


def _smtp_failure_may_be_network_block(error: Optional[str]) -> bool:
    if not error:
        return False
    lowered = error.lower()
    markers = ("délai dépassé", "timeout", "bloqu", "587", "465", "interrompue après")
    return any(marker in lowered for marker in markers)


def _finalize_smtp_config(
    cfg: Dict[str, Any],
    db: Session,
    overrides: Optional[Dict[str, Any]] = None,
) -> tuple[Dict[str, Any], Optional[str]]:
    """Normalise hôte/port Mailtrap et valide les identifiants courants."""
    cfg = dict(cfg)
    host = _normalize_smtp_host(str(cfg.get("host") or ""))
    cfg["host"] = host

    if int(cfg.get("port") or 587) in (587, 465) and (
        is_mailtrap_sandbox_host(host) or is_mailtrap_live_host(host)
    ):
        cfg["port"] = 2525

    if is_mailtrap_live_host(host):
        cfg["user"] = "api"
        password = str(cfg.get("password") or "").strip()
        if not password:
            password = os.getenv("MAILTRAP_API_TOKEN", "").strip()
            cfg["password"] = password
        if not password:
            return cfg, (
                "Token API Mailtrap manquant pour l'envoi réel. "
                "Créez un token dans Mailtrap → Settings → API Tokens (scope Sending) "
                "et collez-le dans « Mot de passe SMTP », ou définissez MAILTRAP_API_TOKEN."
            )

        from_addr = str(cfg.get("from_addr") or "").strip()
        if not from_addr or "mailtrap.io" in from_addr.lower():
            contact = _read_setting(db, "contactEmail", "contact@kswstudio.fr") or ""
            if contact and "mailtrap.io" not in contact.lower():
                cfg["from_addr"] = contact
            else:
                return cfg, (
                    "Expéditeur invalide pour l'envoi réel. "
                    "Utilisez une adresse @votre-domaine vérifié dans Mailtrap → Email Sending → Domains."
                )
        return cfg, None

    if is_mailtrap_sandbox_host(host) or (
        "mailtrap.io" in host.lower() and not is_mailtrap_live_host(host)
    ):
        user = str(cfg.get("user") or "").strip()
        if user.lower() == "api":
            return cfg, (
                "Le token API Mailtrap ne fonctionne pas en mode sandbox. "
                "Cliquez « Mailtrap envoi réel (production) » : hôte live.smtp.mailtrap.io, utilisateur api."
            )
        if not user or "@" in user:
            return cfg, (
                "Identifiant sandbox incorrect : utilisez le « Username » alphanumérique "
                "depuis Mailtrap → Email Testing → Inbox → SMTP (pas une adresse email)."
            )

        from_addr = str(cfg.get("from_addr") or "").strip()
        if not from_addr or "mailtrap.io" in from_addr.lower():
            cfg["from_addr"] = (
                _read_setting(db, "contactEmail", "contact@kswstudio.fr") or "noreply@kswstudio.fr"
            )

    if is_gmail_host(host):
        user = str(cfg.get("user") or "").strip()
        if not user or "@" not in user:
            return cfg, (
                "Gmail : saisissez votre adresse Gmail complète dans « Utilisateur » "
                "(ex. vous@gmail.com)."
            )
        gmail_creds = _gmail_api_credentials()
        use_api = _gmail_api_preferred(db, cfg, overrides)
        if use_api and not gmail_creds:
            return cfg, _gmail_missing_api_message()
        if not use_api and not str(cfg.get("password") or "").strip():
            return cfg, (
                "Gmail : utilisez un mot de passe d'application Google (16 caractères), "
                "pas votre mot de passe Google. Si les ports 587/465 sont bloqués sur votre réseau, "
                "cochez « API Gmail (HTTPS) » et configurez GMAIL_* dans .env."
            )
        from_addr = str(cfg.get("from_addr") or "").strip()
        if not from_addr or "@" not in from_addr:
            cfg["from_addr"] = user
        port = int(cfg.get("port") or 587)
        if port not in (587, 465):
            cfg["port"] = 587

    return cfg, None


def _normalize_smtp_host(host: str) -> str:
    cleaned = str(host or "").strip()
    for prefix in ("https://", "http://"):
        if cleaned.lower().startswith(prefix):
            cleaned = cleaned[len(prefix):]
    return cleaned.split("/")[0].strip()


def _format_smtp_error(exc: Exception, cfg: Dict[str, Any]) -> str:
    host = _normalize_smtp_host(str(cfg.get("host", "")))
    port = int(cfg.get("port") or 587)
    if isinstance(exc, (socket.timeout, TimeoutError, concurrent.futures.TimeoutError)):
        tips = (
            "Votre réseau ou FAI bloque probablement le port "
            f"{port} (fréquent sur Wi‑Fi d'entreprise ou box domestique)."
        )
        if "gmail.com" in host.lower():
            tips += (
                " Gmail n'accepte que les ports 587 et 465 — depuis ce réseau, activez "
                "« API Gmail (HTTPS) » dans Paramètres → Sécurité (contourne le blocage via le port 443), "
                "ou testez depuis un réseau 4G / VPN, ou déployez en production."
            )
        elif port in (587, 465):
            tips += " Essayez le port 2525 (Mailtrap) ou testez depuis un autre réseau / VPN."
        else:
            tips += " Vérifiez l'hôte, le port et que le serveur autorise les connexions sortantes."
        return f"Délai dépassé en connexion à {host}:{port}. {tips}"
    message = str(exc).strip()
    lowered = message.lower()
    if "authentication failed" in lowered or "535" in lowered:
        if is_gmail_host(host):
            return (
                "Gmail a refusé la connexion — utilisez un mot de passe d'application "
                "(pas le mot de passe du compte) avec la 2FA activée sur Google."
            )
        return "Authentification refusée — vérifiez l'utilisateur et le mot de passe SMTP."
    if "mailtrap.io" in lowered and ("not allowed" in lowered or "550" in lowered):
        return (
            "Adresse expéditeur refusée par Mailtrap. Utilisez contact@kswstudio.fr (ou votre email contact) "
            "— pas smtp@mailtrap.io."
        )
    if "domain" in lowered and ("verify" in lowered or "verified" in lowered or "550" in lowered):
        return (
            "Domaine expéditeur non vérifié. Ajoutez et vérifiez votre domaine dans "
            "Mailtrap → Email Sending → Domains, puis utilisez une adresse @ce-domaine."
        )
    if "connection refused" in lowered:
        return f"Connexion refusée par {host}:{port} — port ou protocole incorrect."
    if "getaddrinfo failed" in lowered or "name or service not known" in lowered:
        return f"Serveur SMTP introuvable : « {host} ». Vérifiez l'adresse du serveur."
    if "connection unexpectedly closed" in lowered or "connection reset" in lowered:
        if is_mailtrap_sandbox_host(host):
            return (
                "Connexion sandbox interrompue — vérifiez Username et Password depuis "
                "Mailtrap → Email Testing → Inbox → SMTP (pas le token API d'envoi réel)."
            )
        if is_mailtrap_live_host(host):
            return (
                "Connexion SMTP live interrompue — le token API est peut‑être utilisé via SMTP. "
                "Réessayez : l'application basculera sur l'API HTTPS Mailtrap si le token est valide."
            )
        return (
            f"Connexion fermée par {host}:{port}. Vérifiez identifiants, port (2525) et protocole TLS."
        )
    return message or "Erreur SMTP inconnue."


def _smtp_ssl_context() -> ssl.SSLContext:
    return ssl.create_default_context()


def _should_use_mailtrap_api(cfg: Dict[str, Any]) -> bool:
    host = _normalize_smtp_host(str(cfg.get("host") or ""))
    if is_mailtrap_live_host(host):
        return True
    user = str(cfg.get("user") or "").strip().lower()
    token = str(cfg.get("password") or "").strip() or _mailtrap_live_token()
    return user == "api" and bool(token)


def _deliver_mailtrap_api_message(
    cfg: Dict[str, Any],
    to_clean: str,
    subject: str,
    html_body: str,
    text_body: str,
) -> tuple[bool, Optional[str]]:
    token = str(cfg.get("password") or "").strip() or _mailtrap_live_token()
    if not token:
        return False, "Token API Mailtrap manquant."

    from_email = str(cfg.get("from_addr") or "").strip()
    if not from_email or "mailtrap.io" in from_email.lower() or from_email.endswith("@demomailtrap.co"):
        return False, (
            "Expéditeur invalide pour l'envoi réel. Utilisez contact@votre-domaine-vérifié "
            "(Mailtrap → Email Sending → Domains), pas hello@demomailtrap.co."
        )

    payload = {
        "from": {"email": from_email},
        "to": [{"email": to_clean}],
        "subject": subject,
        "html": html_body,
        "text": text_body,
    }
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        "https://send.api.mailtrap.io/api/send",
        data=data,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            if 200 <= response.status < 300:
                return True, None
            body = response.read().decode("utf-8", errors="replace")
            return False, body or f"Erreur Mailtrap API (HTTP {response.status})."
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        if exc.code == 401:
            return False, "Token API Mailtrap invalide ou expiré (401)."
        if exc.code == 403:
            return False, "Token API sans permission Sending — recréez un token avec scope envoi transactionnel."
        if exc.code == 422 and body:
            return False, f"Paramètres refusés par Mailtrap : {body[:300]}"
        return False, body or f"Erreur Mailtrap API (HTTP {exc.code})."
    except urllib.error.URLError as exc:
        return False, f"Impossible de joindre l'API Mailtrap : {exc.reason}"


def _run_mailtrap_api_delivery(
    cfg: Dict[str, Any],
    to_clean: str,
    subject: str,
    html_body: str,
    text_body: str,
    *,
    hard_timeout_sec: Optional[int] = None,
) -> tuple[bool, Optional[str]]:
    timeout = hard_timeout_sec or SMTP_HARD_TIMEOUT_SEC
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(
            _deliver_mailtrap_api_message, cfg, to_clean, subject, html_body, text_body
        )
        try:
            return future.result(timeout=timeout)
        except concurrent.futures.TimeoutError:
            return False, "Délai dépassé en appel à l'API Mailtrap (send.api.mailtrap.io)."


def _connect_smtp(cfg: Dict[str, Any]) -> smtplib.SMTP:
    host = _normalize_smtp_host(cfg["host"])
    port = int(cfg["port"] or 587)
    timeout = SMTP_SOCKET_TIMEOUT_SEC
    context = _smtp_ssl_context()

    if port == 465:
        server: smtplib.SMTP = smtplib.SMTP_SSL(host, port, timeout=timeout, context=context)
        server.ehlo()
        return server

    server = smtplib.SMTP(host, port, timeout=timeout)
    server.ehlo()
    if cfg["use_tls"]:
        server.starttls(context=context)
        server.ehlo()
    return server


def _deliver_smtp_message(cfg: Dict[str, Any], msg: MIMEMultipart, to_clean: str) -> tuple[bool, Optional[str]]:
    server = None
    try:
        server = _connect_smtp(cfg)
        if cfg["user"]:
            server.login(cfg["user"], cfg["password"])
        server.sendmail(cfg["from_addr"], [to_clean], msg.as_string())
        return True, None
    except Exception as exc:
        print(f"[EMAIL ERROR] {to_clean}: {exc}")
        return False, _format_smtp_error(exc, cfg)
    finally:
        if server is not None:
            try:
                server.quit()
            except Exception:
                pass


def is_development() -> bool:
    return os.getenv("ENVIRONMENT", "development").lower() in ("development", "dev", "local")


def _run_smtp_delivery(
    cfg: Dict[str, Any],
    msg: MIMEMultipart,
    to_clean: str,
    *,
    hard_timeout_sec: Optional[int] = None,
) -> tuple[bool, Optional[str]]:
    timeout = hard_timeout_sec or SMTP_HARD_TIMEOUT_SEC
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(_deliver_smtp_message, cfg, msg, to_clean)
        try:
            return future.result(timeout=timeout)
        except concurrent.futures.TimeoutError:
            host = _normalize_smtp_host(cfg.get("host", ""))
            port = cfg.get("port", 587)
            return (
                False,
                f"Connexion SMTP interrompue après {timeout}s ({host}:{port}). "
                + (
                    "Gmail est souvent inaccessible depuis ce réseau (ports 587/465 bloqués). "
                    "Testez avec Mailtrap sur le port 2525, ou déployez en production."
                    if "gmail.com" in host.lower()
                    else "Port probablement bloqué par votre FAI — essayez 2525 (Mailtrap) ou un autre réseau."
                ),
            )


def _send_email_impl(
    db: Session,
    to: str,
    subject: str,
    html_body: str,
    text_body: Optional[str] = None,
    smtp_overrides: Optional[Dict[str, Any]] = None,
    *,
    hard_timeout_sec: Optional[int] = None,
    require_delivery: bool = False,
) -> tuple[bool, Optional[str]]:
    to_clean = (to or "").strip()
    if not to_clean or "@" not in to_clean:
        return False, "Adresse email destinataire invalide."

    cfg = load_smtp_config(db, smtp_overrides)
    cfg, config_error = _finalize_smtp_config(cfg, db, smtp_overrides)
    if config_error:
        return False, config_error

    text = text_body or html_body.replace("<br>", "\n").replace("<br/>", "\n")

    if not cfg["enabled"] or not cfg["host"]:
        if is_development() and not require_delivery:
            print(f"[EMAIL DEV] → {to_clean}\n  Sujet: {subject}\n  {text[:500]}")
            return True, None
        return (
            False,
            "SMTP désactivé ou serveur non configuré. Activez SMTP et renseignez l'hôte dans Paramètres → Sécurité.",
        )

    gmail_creds = _gmail_api_credentials()
    gmail_api_only = _should_use_gmail_api_only(db, cfg, smtp_overrides)

    if cfg["user"] and not cfg["password"] and not gmail_api_only:
        return (
            False,
            "Mot de passe SMTP manquant. Saisissez-le dans le champ « Mot de passe SMTP » puis relancez le test — "
            "il sera enregistré automatiquement.",
        )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = cfg["from_addr"]
    msg["To"] = to_clean
    msg.attach(MIMEText(text, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    if gmail_api_only:
        if not gmail_creds:
            return False, _gmail_missing_api_message()
        api_ok, api_err = _run_gmail_api_delivery(gmail_creds, msg, hard_timeout_sec=hard_timeout_sec)
        if api_ok:
            return True, None
        if _should_try_mailtrap_fallback(api_err):
            return _try_mailtrap_fallback_delivery(
                db,
                cfg,
                to_clean,
                subject,
                html_body,
                text,
                hard_timeout_sec=hard_timeout_sec,
                primary_error=api_err,
            )
        return False, api_err

    if _should_use_mailtrap_api(cfg):
        api_ok, api_err = _run_mailtrap_api_delivery(
            cfg, to_clean, subject, html_body, text, hard_timeout_sec=hard_timeout_sec
        )
        if api_ok:
            return True, None
        if api_err and ("permission sending" in api_err.lower() or "403" in api_err):
            sandbox_ok, sandbox_err = _deliver_mailtrap_sandbox_api_message(
                to_clean, subject, html_body, text
            )
            if sandbox_ok:
                if is_development():
                    print(
                        "[EMAIL SANDBOX] Message capturé dans Mailtrap Sandbox "
                        f"(inbox {os.getenv('MAILTRAP_SANDBOX_ID', '?')}) — pas de livraison réelle."
                    )
                return True, None
            detail = (
                f"{api_err}\n\n"
                "Pour l'envoi réel : Mailtrap → Settings → API Tokens → scope « Email Sending », "
                "puis domaine vérifié (contact@kswstudio.fr).\n"
                "Pour les tests : MAILTRAP_SANDBOX_ID + token « Email Testing » dans .env."
            )
            if sandbox_err:
                detail += f"\nSandbox : {sandbox_err}"
            return False, detail
        if is_mailtrap_live_host(cfg["host"]) or str(cfg.get("user", "")).lower() == "api":
            return False, api_err

    smtp_ok, smtp_err = _run_smtp_delivery(cfg, msg, to_clean, hard_timeout_sec=hard_timeout_sec)
    if smtp_ok:
        return True, None

    if is_gmail_host(str(cfg.get("host") or "")) and _smtp_failure_may_be_network_block(smtp_err):
        if gmail_creds:
            api_ok, api_err = _run_gmail_api_delivery(gmail_creds, msg, hard_timeout_sec=hard_timeout_sec)
            if api_ok:
                return True, None
            if _should_try_mailtrap_fallback(api_err):
                return _try_mailtrap_fallback_delivery(
                    db,
                    cfg,
                    to_clean,
                    subject,
                    html_body,
                    text,
                    hard_timeout_sec=hard_timeout_sec,
                    primary_error=f"{smtp_err} Tentative API Gmail (HTTPS) : {api_err}",
                )
            return False, f"{smtp_err} Tentative API Gmail (HTTPS) : {api_err}"
        return False, f"{smtp_err}\n\n{_gmail_missing_api_message()}"

    return False, smtp_err


def send_email(
    db: Session,
    to: str,
    subject: str,
    html_body: str,
    text_body: Optional[str] = None,
    smtp_overrides: Optional[Dict[str, Any]] = None,
) -> bool:
    ok, _ = _send_email_impl(db, to, subject, html_body, text_body, smtp_overrides)
    return ok


def studio_name(db: Session) -> str:
    return _read_setting(db, "studioName", "KSW STUDIO") or "KSW STUDIO"


def admin_email(db: Session) -> str:
    return _read_setting(db, "contactEmail", "contact@kswstudio.fr")


def resolve_2fa_delivery_email(db: Session, account_email: str) -> str:
    """Adresse réelle pour recevoir le code 2FA (évite les emails @kswstudio.fr fictifs)."""
    email = (account_email or "").strip()
    lowered = email.lower()
    internal_domains = ("@kswstudio.fr", "@demomailtrap.co", "@mailtrap.io")
    if any(lowered.endswith(domain) for domain in internal_domains):
        for candidate in (
            os.getenv("ADMIN_2FA_EMAIL", "").strip(),
            os.getenv("SMTP_USER", "").strip(),
            _read_setting(db, "contactEmail", "").strip(),
        ):
            cand_lower = candidate.lower()
            if (
                candidate
                and "@" in candidate
                and not any(cand_lower.endswith(domain) for domain in internal_domains)
            ):
                return candidate
    return email


def notify_contact_received(db: Session, entry: Dict[str, Any]) -> Dict[str, bool]:
    name = studio_name(db)
    client_email = entry.get("email", "")
    client_name = entry.get("name", "Client")
    subject_client = f"{name} — Nous avons bien reçu votre message"
    html_client = f"""
    <p>Bonjour {client_name},</p>
    <p>Merci pour votre message concernant <strong>{entry.get('subject', 'votre demande')}</strong>.</p>
    <p>Notre équipe vous répondra sous 24 à 48 h ouvrées.</p>
    <p>Cordialement,<br/>{name}</p>
    """
    subject_admin = f"[Contact] {entry.get('subject', 'Nouveau message')} — {client_name}"
    html_admin = f"""
    <p><strong>Nouveau message contact</strong></p>
    <ul>
      <li>Nom : {client_name}</li>
      <li>Email : {client_email}</li>
      <li>Téléphone : {entry.get('phone') or '—'}</li>
      <li>Sujet : {entry.get('subject')}</li>
    </ul>
    <p>{entry.get('message', '')}</p>
    """
    return {
        "client": send_email(db, client_email, subject_client, html_client),
        "admin": send_email(db, admin_email(db), subject_admin, html_admin),
    }


def notify_booking_created(db: Session, entry: Dict[str, Any]) -> Dict[str, bool]:
    name = studio_name(db)
    client_email = entry.get("email", "")
    client_label = f"{entry.get('firstName', '')} {entry.get('lastName', '')}".strip()
    ref = entry.get("reference", "")
    subject_client = f"{name} — Demande de réservation enregistrée ({ref})"
    html_client = f"""
    <p>Bonjour {client_label},</p>
    <p>Votre demande pour <strong>{entry.get('serviceTitle')}</strong> le {entry.get('date')} à {entry.get('time')} a été enregistrée.</p>
    <p>Référence : <strong>{ref}</strong></p>
    <p>Prochaine étape : régler l'acompte de {entry.get('depositAmount')}€ via le tunnel de réservation.</p>
    <p>Cordialement,<br/>{name}</p>
    """
    subject_admin = f"[Réservation] {ref} — {client_label}"
    html_admin = f"""
    <p><strong>Nouvelle demande de réservation</strong></p>
    <ul>
      <li>Réf. : {ref}</li>
      <li>Client : {client_label} ({client_email})</li>
      <li>Prestation : {entry.get('serviceTitle')}</li>
      <li>Date : {entry.get('date')} à {entry.get('time')}</li>
      <li>Total : {entry.get('totalPrice')}€ — Acompte : {entry.get('depositAmount')}€</li>
    </ul>
    """
    return {
        "client": send_email(db, client_email, subject_client, html_client),
        "admin": send_email(db, admin_email(db), subject_admin, html_admin),
    }


def notify_payment_received(db: Session, entry: Dict[str, Any]) -> Dict[str, bool]:
    name = studio_name(db)
    client_email = entry.get("email", "")
    client_label = f"{entry.get('firstName', '')} {entry.get('lastName', '')}".strip()
    ref = entry.get("reference", "")
    subject_client = f"{name} — Acompte reçu pour {ref}"
    html_client = f"""
    <p>Bonjour {client_label},</p>
    <p>Nous confirmons la réception de votre acompte de <strong>{entry.get('depositAmount')}€</strong> pour la réservation <strong>{ref}</strong>.</p>
    <p>Votre créneau du {entry.get('date')} à {entry.get('time')} est confirmé.</p>
    <p>Cordialement,<br/>{name}</p>
    """
    return {
        "client": send_email(db, client_email, subject_client, html_client),
        "admin": send_email(db, admin_email(db), f"[Paiement] Acompte {ref}", html_client),
    }


def notify_session_confirmed(db: Session, entry: Dict[str, Any]) -> Dict[str, bool]:
    name = studio_name(db)
    client_email = entry.get("email", "")
    client_label = f"{entry.get('firstName', '')} {entry.get('lastName', '')}".strip() or "Bonjour"
    ref = entry.get("reference", "")
    location = entry.get("location") or "—"
    tx_ref = entry.get("mobileMoneyConfirmedReference") or entry.get("mobileMoneyReference") or "—"
    deposit = entry.get("depositAmount", "")

    subject_client = f"{name} — Séance confirmée ({ref})"
    html_client = f"""
    <p>Bonjour {client_label},</p>
    <p>Votre paiement Mobile Money a été validé. <strong>Votre séance est confirmée.</strong></p>
    <ul>
      <li><strong>Référence réservation :</strong> {ref}</li>
      <li><strong>Prestation :</strong> {entry.get('serviceTitle', '—')}</li>
      <li><strong>Date :</strong> {entry.get('date', '—')} à {entry.get('time', '—')}</li>
      <li><strong>Lieu :</strong> {location}</li>
      <li><strong>Acompte réglé :</strong> {deposit}€</li>
      <li><strong>Réf. transaction :</strong> {tx_ref}</li>
    </ul>
    <p>Le studio vous contactera si des détails complémentaires sont nécessaires avant le jour J.</p>
    <p>Cordialement,<br/>{name}</p>
    """
    text = (
        f"Bonjour {client_label},\n\n"
        f"Votre séance est confirmée.\n"
        f"Réf. réservation : {ref}\n"
        f"Prestation : {entry.get('serviceTitle', '—')}\n"
        f"Date : {entry.get('date', '—')} à {entry.get('time', '—')}\n"
        f"Lieu : {location}\n"
        f"Acompte : {deposit}€\n"
        f"Transaction : {tx_ref}\n\n{name}"
    )
    return {
        "client": send_email(db, client_email, subject_client, html_client, text),
        "admin": send_email(db, admin_email(db), f"[Séance confirmée] {ref}", html_client, text),
    }


def frontend_base_url() -> str:
    return (os.getenv("FRONTEND_URL") or os.getenv("NEXT_PUBLIC_SITE_URL") or "http://localhost:3000").rstrip("/")


def send_2fa_code_email(
    db: Session,
    to: str,
    code: str,
    user_name: str = "",
) -> tuple[bool, Optional[str]]:
    name = studio_name(db)
    greeting = user_name or "Bonjour"
    subject = f"{name} — Code de connexion"
    html = f"""
    <p>{greeting},</p>
    <p>Voici votre code de double authentification pour accéder à <strong>{name}</strong> :</p>
    <p style="font-size:28px;font-weight:bold;letter-spacing:0.35em;font-family:monospace;color:#fbbf24;">{code}</p>
    <p>Ce code expire dans 10 minutes. Si vous n'avez pas tenté de vous connecter, ignorez cet email.</p>
    <p>Cordialement,<br/>{name}</p>
    """
    text = (
        f"{greeting},\n\n"
        f"Code de connexion : {code}\n"
        f"Valide 10 minutes.\n\n"
        f"Si vous n'avez pas tenté de vous connecter, ignorez cet email.\n\n{name}"
    )
    return _send_email_impl(db, to, subject, html, text, require_delivery=True)


def send_password_reset_email(db: Session, to: str, token: str, user_name: str = "") -> bool:
    name = studio_name(db)
    reset_url = f"{frontend_base_url()}/reset-password?token={token}"
    greeting = user_name or "Bonjour"
    subject = f"{name} — Réinitialisation de votre mot de passe"
    html = f"""
    <p>{greeting},</p>
    <p>Vous avez demandé la réinitialisation de votre mot de passe pour votre espace {name}.</p>
    <p><a href="{reset_url}" style="color:#fbbf24;font-weight:bold;">Cliquez ici pour choisir un nouveau mot de passe</a></p>
    <p>Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
    <p>Cordialement,<br/>{name}</p>
    """
    text = (
        f"{greeting},\n\n"
        f"Réinitialisez votre mot de passe : {reset_url}\n\n"
        f"Ce lien expire dans 1 heure.\n\n{name}"
    )
    ok, _ = _send_email_impl(db, to, subject, html, text, require_delivery=True)
    return ok


def send_test_email(
    db: Session,
    to: str,
    smtp_overrides: Optional[Dict[str, Any]] = None,
) -> tuple[bool, Optional[str]]:
    name = studio_name(db)
    return _send_email_impl(
        db,
        to,
        f"{name} — Test SMTP",
        f"<p>Ceci est un email de test depuis <strong>{name}</strong>.</p><p>Configuration SMTP opérationnelle.</p>",
        f"Ceci est un email de test depuis {name}. Configuration SMTP opérationnelle.",
        smtp_overrides,
        hard_timeout_sec=SMTP_HARD_TIMEOUT_SEC,
        require_delivery=True,
    )


def _send_gallery_access_notification(
    db: Session,
    *,
    client_email: str,
    client_label: str,
    access_key: str,
    password: str,
    gallery_title: str,
    reference: str = "",
) -> tuple[bool, Optional[str]]:
    name = studio_name(db)
    to = (client_email or "").strip()
    if not to:
        return False, "Adresse email client manquante."

    unlock_url = f"{frontend_base_url()}/galerie/{access_key}"
    ref = (reference or "").strip()
    ref_html = f"<p>Référence réservation : <strong>{ref}</strong></p>" if ref else ""
    ref_text = f"Référence réservation : {ref}\n" if ref else ""

    subject = f"{name} — Accès à votre galerie privée" + (f" ({ref})" if ref else "")
    html = f"""
    <p>Bonjour {client_label},</p>
    <p>Votre espace galerie privé <strong>{gallery_title}</strong> est prêt.</p>
    <p>Accédez directement à vos photos avec la clé ci-dessous — aucune connexion requise :</p>
    <ul>
      <li><strong>Clé d'accès :</strong> {access_key}</li>
      <li><strong>Mot de passe :</strong> {password or '—'}</li>
    </ul>
    <p><a href="{unlock_url}" style="color:#fbbf24;font-weight:bold;">Accéder à ma galerie privée</a></p>
    {ref_html}
    <p>Cordialement,<br/>{name}</p>
    """
    text = (
        f"Bonjour {client_label},\n\n"
        f"Galerie : {gallery_title}\n"
        f"Clé d'accès : {access_key}\n"
        f"Mot de passe : {password or '—'}\n"
        f"Lien : {unlock_url}\n"
        f"{ref_text}\n{name}"
    )
    return _send_email_impl(db, to, subject, html, text, require_delivery=True)


def send_gallery_access_email(
    db: Session,
    booking: Dict[str, Any],
    *,
    access_key: str,
    password: str,
    gallery_title: str,
) -> tuple[bool, Optional[str]]:
    client_email = (booking.get("email") or "").strip()
    if not client_email:
        return False, "Email client manquant sur la réservation."

    client_label = f"{booking.get('firstName', '')} {booking.get('lastName', '')}".strip() or "Bonjour"
    reference = str(booking.get("reference") or "")
    return _send_gallery_access_notification(
        db,
        client_email=client_email,
        client_label=client_label,
        access_key=access_key,
        password=password,
        gallery_title=gallery_title,
        reference=reference,
    )


def send_gallery_access_for_gallery(
    db: Session,
    gallery: Any,
    *,
    delivery_email: Optional[str] = None,
    booking_reference: str = "",
    plain_password: Optional[str] = None,
) -> tuple[bool, Optional[str]]:
    client_email = (delivery_email or getattr(gallery, "client_email", None) or "").strip()
    if not client_email:
        return False, "Email client manquant. Renseignez l'email sur la galerie ou liez une réservation."

    client_name = (getattr(gallery, "client_name", None) or "Client").strip()
    access_key = (getattr(gallery, "access_key", None) or "").strip()
    if not access_key:
        return False, "Clé d'accès galerie manquante."

    password = (plain_password or getattr(gallery, "password", None) or "").strip()

    return _send_gallery_access_notification(
        db,
        client_email=client_email,
        client_label=client_name or "Bonjour",
        access_key=access_key,
        password=password,
        gallery_title=(getattr(gallery, "title", None) or "Galerie").strip(),
        reference=booking_reference,
    )


def send_gallery_photos_ready_email(
    db: Session,
    *,
    client_email: str,
    client_name: str,
    gallery_title: str,
    access_key: str,
    password: str,
    new_photos_count: int,
    booking_reference: str = "",
) -> bool:
    name = studio_name(db)
    to = (client_email or "").strip()
    if not to:
        return False

    unlock_url = f"{frontend_base_url()}/galerie/{access_key}"
    count_label = "nouvelle photo" if new_photos_count == 1 else "nouvelles photos"
    ref_line = f"<p>Réservation : <strong>{booking_reference}</strong></p>" if booking_reference else ""

    subject = f"{name} — {new_photos_count} {count_label} dans votre galerie"
    html = f"""
    <p>Bonjour {client_name or 'Bonjour'},</p>
    <p>{new_photos_count} {count_label} viennent d'être ajoutée(s) à votre galerie privée
    <strong>{gallery_title}</strong>.</p>
    {ref_line}
    <p>Connectez-vous avec votre clé d'accès (aucun compte requis) :</p>
    <ul>
      <li><strong>Clé d'accès :</strong> {access_key}</li>
      <li><strong>Mot de passe :</strong> {password or '—'}</li>
    </ul>
    <p><a href="{unlock_url}" style="color:#fbbf24;font-weight:bold;">Voir mes photos</a></p>
    <p>Cordialement,<br/>{name}</p>
    """
    text = (
        f"Bonjour {client_name or ''},\n\n"
        f"{new_photos_count} {count_label} ajoutée(s) à « {gallery_title} ».\n"
        f"Clé : {access_key}\nMot de passe : {password or '—'}\n"
        f"Lien : {unlock_url}\n\n{name}"
    )
    return send_email(db, to, subject, html, text)


def _invitation_public_url(token: str) -> str:
    return f"{frontend_base_url()}/invitation/{token}"


def notify_invitation_subscribed(db: Session, inv: Any) -> Dict[str, bool]:
    """Email client (accusé réception) + admin (nouvelle demande)."""
    from invitation_helpers import EVENT_TYPES

    name = studio_name(db)
    client_email = str(getattr(inv, "client_email", "") or "").strip()
    client_label = str(getattr(inv, "client_name", "") or "Bonjour")
    organizer = str(getattr(inv, "organizer_names", "") or "")
    event_type = EVENT_TYPES.get(getattr(inv, "event_type", ""), getattr(inv, "event_type", ""))
    event_date = str(getattr(inv, "event_date", "") or "")

    subject_client = f"{name} — Demande d'invitation électronique reçue"
    html_client = f"""
    <p>Bonjour {client_label},</p>
    <p>Nous avons bien enregistré votre demande d'invitation électronique pour
    <strong>{organizer}</strong> ({event_type}, {event_date}).</p>
    <p>Statut : <strong>En attente de validation</strong> par notre équipe.</p>
    <p>Vous serez notifié(e) dès que votre invitation sera prête.</p>
    <p>Cordialement,<br/>{name}</p>
    """
    text_client = (
        f"Bonjour {client_label},\n\n"
        f"Demande enregistrée pour {organizer} ({event_type}, {event_date}).\n"
        f"Statut : en attente de validation.\n\n{name}"
    )

    subject_admin = f"[Invitation] Nouvelle demande — {organizer}"
    html_admin = f"""
    <p><strong>Nouvelle demande d'invitation électronique</strong></p>
    <ul>
      <li>Client : {client_label} ({client_email})</li>
      <li>Événement : {event_type}</li>
      <li>Organisateur(s) : {organizer}</li>
      <li>Date : {event_date}</li>
    </ul>
    <p>Consultez le dashboard admin → Invitations électroniques.</p>
    """
    return {
        "client": send_email(db, client_email, subject_client, html_client, text_client) if client_email else False,
        "admin": send_email(db, admin_email(db), subject_admin, html_admin),
    }


def notify_invitation_validated(db: Session, inv: Any) -> bool:
    from invitation_helpers import EVENT_TYPES

    name = studio_name(db)
    client_email = str(getattr(inv, "client_email", "") or "").strip()
    if not client_email:
        return False
    client_label = str(getattr(inv, "client_name", "") or "Bonjour")
    organizer = str(getattr(inv, "organizer_names", "") or "")
    event_type = EVENT_TYPES.get(getattr(inv, "event_type", ""), "")

    subject = f"{name} — Votre invitation électronique est validée"
    html = f"""
    <p>Bonjour {client_label},</p>
    <p>Bonne nouvelle : votre demande d'invitation pour <strong>{organizer}</strong>
    ({event_type}) a été <strong>validée</strong> par {name}.</p>
    <p>Notre équipe prépare votre invitation et vous enverra le lien de partage très prochainement.</p>
    <p>Cordialement,<br/>{name}</p>
    """
    text = (
        f"Bonjour {client_label},\n\n"
        f"Votre invitation pour {organizer} est validée. "
        f"Le lien de partage vous sera communiqué sous peu.\n\n{name}"
    )
    return send_email(db, client_email, subject, html, text)


def notify_invitation_rejected(db: Session, inv: Any, reason: str = "") -> bool:
    name = studio_name(db)
    client_email = str(getattr(inv, "client_email", "") or "").strip()
    if not client_email:
        return False
    client_label = str(getattr(inv, "client_name", "") or "Bonjour")
    motif = reason or str(getattr(inv, "rejection_reason", "") or "Demande refusée.")

    subject = f"{name} — Demande d'invitation — décision du studio"
    html = f"""
    <p>Bonjour {client_label},</p>
    <p>Suite à l'examen de votre demande d'invitation électronique, nous ne pouvons pas la valider
    en l'état.</p>
    <p><strong>Motif :</strong> {motif}</p>
    <p>Contactez-nous pour ajuster votre projet ou soumettre une nouvelle demande.</p>
    <p>Cordialement,<br/>{name}</p>
    """
    text = f"Bonjour {client_label},\n\nMotif : {motif}\n\n{name}"
    return send_email(db, client_email, subject, html, text)


def notify_invitation_ready(db: Session, inv: Any) -> bool:
    name = studio_name(db)
    client_email = str(getattr(inv, "client_email", "") or "").strip()
    token = str(getattr(inv, "public_token", "") or "").strip()
    if not client_email or not token:
        return False
    client_label = str(getattr(inv, "client_name", "") or "Bonjour")
    organizer = str(getattr(inv, "organizer_names", "") or "")
    public_url = _invitation_public_url(token)

    subject = f"{name} — Votre invitation électronique est prête"
    html = f"""
    <p>Bonjour {client_label},</p>
    <p>Votre invitation électronique pour <strong>{organizer}</strong> est prête à être partagée.</p>
    <p><a href="{public_url}" style="color:#fbbf24;font-weight:bold;">Ouvrir l'invitation</a></p>
    <p>Lien à partager : {public_url}</p>
    <p>Les invités pourront confirmer leur présence directement depuis ce lien.</p>
    <p>Cordialement,<br/>{name}</p>
    """
    text = f"Bonjour {client_label},\n\nInvitation prête : {public_url}\n\n{name}"
    return send_email(db, client_email, subject, html, text)


def notify_invitation_rsvp(
    db: Session,
    inv: Any,
    guest_name: str,
    response: str,
    guest_count: int = 1,
) -> Dict[str, bool]:
    name = studio_name(db)
    client_email = str(getattr(inv, "client_email", "") or "").strip()
    organizer = str(getattr(inv, "organizer_names", "") or "")
    labels = {"yes": "Présent(e)", "no": "Absent(e)", "maybe": "En attente"}
    response_label = labels.get(response, response)

    subject = f"{name} — Nouvelle réponse RSVP — {guest_name}"
    html = f"""
    <p><strong>Nouvelle réponse à l'invitation « {organizer} »</strong></p>
    <ul>
      <li>Invité : {guest_name}</li>
      <li>Réponse : {response_label}</li>
      <li>Nombre de personnes : {guest_count}</li>
    </ul>
    """
    text = f"RSVP {organizer} — {guest_name} : {response_label} ({guest_count} pers.)"

    results = {"admin": send_email(db, admin_email(db), subject, html, text)}
    if client_email:
        results["client"] = send_email(db, client_email, subject, html, text)
    else:
        results["client"] = False
    return results
