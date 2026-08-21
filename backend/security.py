import hashlib
import os
import re
from functools import lru_cache
from typing import Dict, Optional, Tuple
from urllib.parse import urlparse

import bcrypt
from fastapi import HTTPException
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from models import Service

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_SETTING_KEYS = {"stripeSecretKey", "stripeWebhookSecret", "smtpPassword"}
ALLOWED_USER_ROLES = {"admin", "photographer", "assistant", "client"}
PRIVILEGED_ROLES = {"admin", "photographer", "assistant"}
ADMIN_ONLY_ASSIGN_ROLES = {"admin", "photographer", "assistant"}
STRIPE_CHECKOUT_HOSTS = {"checkout.stripe.com", "pay.stripe.com"}
BLOCKED_UPLOAD_EXTENSIONS = {
    ".html", ".htm", ".svg", ".js", ".mjs", ".php", ".phtml", ".exe", ".sh", ".bat", ".cmd",
}

MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(25 * 1024 * 1024)))
MAX_GUEST_UPLOAD_BYTES = int(os.getenv("MAX_GUEST_UPLOAD_BYTES", str(8 * 1024 * 1024)))
MIN_JWT_SECRET_LENGTH = 32
MIN_SUPERUSER_PASSWORD_LENGTH = 16

WEAK_PASSWORDS = frozenset(
    {
        "password",
        "password123",
        "12345678",
        "123456789",
        "qwerty123",
        "admin123",
        "password123!",
        "Password123!",
    }
)


def validate_password_policy(password: str, *, min_length: int = 8) -> None:
    """Politique mot de passe raisonnable — lève HTTPException si invalide."""
    clean = (password or "").strip()
    if len(clean) < min_length:
        raise HTTPException(
            status_code=400,
            detail=f"Le mot de passe doit contenir au moins {min_length} caractères.",
        )
    if clean.lower() in WEAK_PASSWORDS:
        raise HTTPException(status_code=400, detail="Mot de passe trop faible. Choisissez une combinaison plus robuste.")
    if clean.isdigit() or clean.isalpha():
        raise HTTPException(
            status_code=400,
            detail="Le mot de passe doit mélanger lettres et chiffres (ou symboles).",
        )


def is_production() -> bool:
    return os.getenv("ENVIRONMENT", "development").lower() in ("production", "prod")


def is_development() -> bool:
    return os.getenv("ENVIRONMENT", "development").lower() in ("development", "dev", "local")


def validate_jwt_secret_at_startup() -> None:
    secret = os.getenv("JWT_SECRET_KEY", "ksw-dev-secret-change-in-production")
    if is_production() and (not secret or secret == "ksw-dev-secret-change-in-production"):
        raise RuntimeError("JWT_SECRET_KEY doit être défini en production.")
    if is_production() and len(secret) < MIN_JWT_SECRET_LENGTH:
        raise RuntimeError(f"JWT_SECRET_KEY doit contenir au moins {MIN_JWT_SECRET_LENGTH} caractères en production.")


def validate_security_at_startup() -> None:
    """Contrôles de sécurité au démarrage (prod + secrets critiques)."""
    validate_jwt_secret_at_startup()
    if not is_production():
        return
    super_pwd = (os.getenv("SUPERUSER_PASSWORD") or "").strip()
    if not super_pwd or len(super_pwd) < MIN_SUPERUSER_PASSWORD_LENGTH:
        raise RuntimeError(
            f"SUPERUSER_PASSWORD (≥{MIN_SUPERUSER_PASSWORD_LENGTH} caractères) requis en production."
        )


def enforce_upload_size(size_bytes: int, max_bytes: int = MAX_UPLOAD_BYTES) -> None:
    if size_bytes <= 0:
        raise HTTPException(status_code=400, detail="Fichier vide.")
    if size_bytes > max_bytes:
        max_mb = max(1, max_bytes // (1024 * 1024))
        raise HTTPException(status_code=413, detail=f"Fichier trop volumineux (max {max_mb} Mo).")


def hash_password(plain: str) -> str:
    """Hash bcrypt direct — compatible bcrypt 4.x (passlib peut planter au init)."""
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password_hash(stored: str, plain: str) -> bool:
    if not stored or not plain:
        return False
    if re.fullmatch(r"[a-f0-9]{64}", stored or ""):
        return hashlib.sha256(plain.encode("utf-8")).hexdigest() == stored
    if stored.startswith("$2"):
        try:
            return bcrypt.checkpw(plain.encode("utf-8"), stored.encode("utf-8"))
        except Exception:
            return False
    try:
        return pwd_context.verify(plain, stored)
    except Exception:
        return False


@lru_cache(maxsize=1)
def get_allowed_origins() -> frozenset[str]:
    origins = {
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8050",
        "http://127.0.0.1:8050",
    }
    for raw in (os.getenv("CORS_ALLOWED_ORIGINS") or "").split(","):
        item = raw.strip()
        if not item:
            continue
        if not item.startswith("http"):
            item = f"http://{item}" if ":3000" in item else f"https://{item}"
        origins.add(item.rstrip("/"))
    app_url = (os.getenv("NEXT_PUBLIC_APP_URL") or os.getenv("APP_URL") or "").strip()
    if app_url:
        origins.add(app_url.rstrip("/"))
    return frozenset(origins)


def is_origin_allowed(origin: Optional[str]) -> bool:
    if not origin:
        return False
    clean = origin.rstrip("/")
    if clean in get_allowed_origins():
        return True
    if is_development():
        host = (urlparse(clean).hostname or "").lower()
        if host in {"localhost", "127.0.0.1"}:
            return True
        if host.endswith(".ngrok-free.app") or host.endswith(".ngrok-free.dev") or host.endswith(".ngrok.io") or host.endswith(".loca.lt"):
            return True
        if host.startswith("10.") or host.startswith("192.168.") or re.match(r"172\.(1[6-9]|2\d|3[01])\.", host):
            return True
    return False


def security_headers() -> Dict[str, str]:
    headers = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "SAMEORIGIN",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    }
    if is_production():
        headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
    return headers


def cors_headers(origin: Optional[str]) -> Dict[str, str]:
    headers = {
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
        "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, X-Requested-With",
        "Cache-Control": "no-cache, no-store, must-revalidate",
    }
    if origin and is_origin_allowed(origin):
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    return headers


def check_rate_limit(key: str, *, max_attempts: int = 10, window_seconds: int = 900) -> None:
    from rate_limit_store import check_rate_limit as _check

    _check(key, max_attempts=max_attempts, window_seconds=window_seconds)


def resolve_booking_pricing(db: Session, service_id: str, service_title: str = "") -> Tuple[str, float, float]:
    service = db.query(Service).filter(Service.id == str(service_id)).first()
    if not service:
        raise HTTPException(status_code=404, detail="Prestation introuvable.")
    total_price = float(service.price or 0)
    if total_price <= 0:
        raise HTTPException(status_code=400, detail="Tarif prestation invalide.")
    deposit_pct = int(service.deposit_percentage or 30)
    deposit_amount = round(total_price * deposit_pct / 100, 2)
    if deposit_amount <= 0:
        raise HTTPException(status_code=400, detail="Montant d'acompte invalide.")
    title = (service.title or service_title or "Séance photo").strip()
    return title, total_price, deposit_amount


def validate_redirect_url(url: str, *, app_base: str) -> str:
    clean = (url or "").strip()
    if not clean:
        raise HTTPException(status_code=400, detail="URL de redirection requise.")
    parsed = urlparse(clean)
    allowed_hosts = set()
    for origin in get_allowed_origins():
        allowed_hosts.add((urlparse(origin).hostname or "").lower())
    app_host = (urlparse(app_base).hostname or "").lower()
    if app_host:
        allowed_hosts.add(app_host)
    host = (parsed.hostname or "").lower()
    if parsed.scheme not in {"http", "https"} or not host or host not in allowed_hosts:
        raise HTTPException(status_code=400, detail="URL de redirection non autorisée.")
    return clean


def validate_user_role_change(actor_role: str, target_role: str) -> None:
    target = (target_role or "client").strip().lower()
    actor = (actor_role or "client").strip().lower()
    if target not in ALLOWED_USER_ROLES:
        raise HTTPException(status_code=400, detail="Rôle utilisateur invalide.")
    if target in ADMIN_ONLY_ASSIGN_ROLES and actor != "admin":
        raise HTTPException(status_code=403, detail="Seul un administrateur peut attribuer ce rôle.")


def assert_can_modify_user(actor_role: str, target_role: str, *, action: str = "modifier") -> None:
    """Empêche photographer/assistant de toucher aux comptes staff (dont admin)."""
    actor = (actor_role or "client").strip().lower()
    target = (target_role or "client").strip().lower()
    if target in PRIVILEGED_ROLES and actor != "admin":
        raise HTTPException(
            status_code=403,
            detail=f"Seul un administrateur peut {action} un compte {target}.",
        )


# Clés autorisées pour POST /settings (whitelist — pas de mass assignment)
ADMIN_WRITABLE_SETTING_KEYS = frozenset(
    {
        "studioName",
        "studioNameFirstPart",
        "studioNameSecondPart",
        "studioSubtitle",
        "studioDescription",
        "siteTitle",
        "contactEmail",
        "phone",
        "address",
        "studioMapLat",
        "studioMapLng",
        "studioMapZoom",
        "currency",
        "timezone",
        "depositRate",
        "cancellationNoticeDays",
        "autoApproveBookings",
        "socialLinks",
        "stripePublicKey",
        "stripeSecretKey",
        "stripeWebhookSecret",
        "stripeTestMode",
        "payPalEnabled",
        "mobileMoneyEnabled",
        "mobileMoneyProvider",
        "mobileMoneyInstructions",
        "mobileMoneyNumber",
        "watermarkText",
        "watermarkPosition",
        "watermarkOpacity",
        "watermarkShowText",
        "watermarkLogoEnabled",
        "watermarkLogoUrl",
        "watermarkLogoPosition",
        "watermarkLogoSize",
        "watermarkLogoOpacity",
        "webpQuality",
        "force2FAForAdmin",
        "sessionLifetimeHours",
        "smtpEnabled",
        "smtpHost",
        "smtpPort",
        "smtpUser",
        "smtpPassword",
        "smtpFrom",
        "gmailUseApi",
        "homePageContent",
        "portfolioContent",
        "prestationsContent",
        "legalPagesContent",
        "invoiceLogoUrl",
        "showLogoOnInvoice",
    }
)


def filter_admin_settings_update(settings: Dict[str, object]) -> Dict[str, object]:
    """Retourne uniquement les clés autorisées ; ignore le reste (deny unknown keys)."""
    return {k: v for k, v in settings.items() if k in ADMIN_WRITABLE_SETTING_KEYS}


def verify_booking_payment_token(booking: dict, token: str) -> None:
    """Vérifie le jeton de paiement lié à une réservation (anti-IDOR)."""
    expected = str(booking.get("paymentToken") or "").strip()
    supplied = (token or "").strip()
    if not expected or not supplied or supplied != expected:
        raise HTTPException(status_code=403, detail="Jeton de paiement invalide pour cette réservation.")


def is_empty_secret_value(value: object) -> bool:
    if value is None:
        return True
    if isinstance(value, str) and not value.strip():
        return True
    return False


def should_preserve_secret_on_update(key: str, value: object) -> bool:
    return key in SECRET_SETTING_KEYS and is_empty_secret_value(value)


def redact_settings_payload(data: Dict[str, object]) -> Dict[str, object]:
    redacted = dict(data)
    for key in SECRET_SETTING_KEYS:
        if key in redacted and redacted[key]:
            redacted[key] = ""
    return redacted


def is_blocked_upload(filename: str) -> bool:
    ext = os.path.splitext(filename or "")[1].lower()
    return ext in BLOCKED_UPLOAD_EXTENSIONS


def is_safe_proxy_segment(segment: str) -> bool:
    if not segment:
        return False
    lowered = segment.lower()
    if ".." in lowered or "%2e" in lowered or "\\" in segment:
        return False
    return True
