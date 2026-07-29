import json
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from models import Setting


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


def load_smtp_config(db: Session) -> Dict[str, Any]:
    enabled_raw = _read_setting(db, "smtpEnabled", os.getenv("SMTP_ENABLED", "false"))
    enabled = str(enabled_raw).lower() in ("true", "1", "yes") or bool(os.getenv("SMTP_HOST"))

    return {
        "enabled": enabled,
        "host": _read_setting(db, "smtpHost", os.getenv("SMTP_HOST", "")),
        "port": int(_read_setting(db, "smtpPort", os.getenv("SMTP_PORT", "587")) or 587),
        "user": _read_setting(db, "smtpUser", os.getenv("SMTP_USER", "")),
        "password": _read_setting(db, "smtpPassword", os.getenv("SMTP_PASSWORD", "")),
        "from_addr": _read_setting(
            db,
            "smtpFrom",
            os.getenv("SMTP_FROM", _read_setting(db, "contactEmail", "contact@kswstudio.fr")),
        ),
        "use_tls": str(_read_setting(db, "smtpUseTls", os.getenv("SMTP_USE_TLS", "true"))).lower()
        not in ("false", "0", "no"),
    }


def is_development() -> bool:
    return os.getenv("ENVIRONMENT", "development").lower() in ("development", "dev", "local")


def send_email(
    db: Session,
    to: str,
    subject: str,
    html_body: str,
    text_body: Optional[str] = None,
) -> bool:
    to_clean = (to or "").strip()
    if not to_clean or "@" not in to_clean:
        return False

    cfg = load_smtp_config(db)
    text = text_body or html_body.replace("<br>", "\n").replace("<br/>", "\n")

    if not cfg["enabled"] or not cfg["host"]:
        if is_development():
            print(f"[EMAIL DEV] → {to_clean}\n  Sujet: {subject}\n  {text[:500]}")
            return True
        print(f"[EMAIL] SMTP non configuré — email non envoyé à {to_clean}")
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = cfg["from_addr"]
    msg["To"] = to_clean
    msg.attach(MIMEText(text, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        if cfg["use_tls"]:
            server = smtplib.SMTP(cfg["host"], cfg["port"], timeout=15)
            server.starttls()
        else:
            server = smtplib.SMTP_SSL(cfg["host"], cfg["port"], timeout=15)
        if cfg["user"]:
            server.login(cfg["user"], cfg["password"])
        server.sendmail(cfg["from_addr"], [to_clean], msg.as_string())
        server.quit()
        return True
    except Exception as exc:
        print(f"[EMAIL ERROR] {to_clean}: {exc}")
        return False


def studio_name(db: Session) -> str:
    return _read_setting(db, "studioName", "KSW STUDIO") or "KSW STUDIO"


def admin_email(db: Session) -> str:
    return _read_setting(db, "contactEmail", "contact@kswstudio.fr")


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


def frontend_base_url() -> str:
    return (os.getenv("FRONTEND_URL") or os.getenv("NEXT_PUBLIC_SITE_URL") or "http://localhost:3000").rstrip("/")


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
    return send_email(db, to, subject, html, text)


def send_test_email(db: Session, to: str) -> bool:
    name = studio_name(db)
    return send_email(
        db,
        to,
        f"{name} — Test SMTP",
        f"<p>Ceci est un email de test depuis <strong>{name}</strong>.</p><p>Configuration SMTP opérationnelle.</p>",
        f"Ceci est un email de test depuis {name}. Configuration SMTP opérationnelle.",
    )
