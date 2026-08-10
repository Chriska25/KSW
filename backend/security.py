import hashlib
import os
import re
import time
from collections import defaultdict
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
_rate_buckets: Dict[str, list[float]] = defaultdict(list)


def is_production() -> bool:
    return os.getenv("ENVIRONMENT", "development").lower() in ("production", "prod")


def is_development() -> bool:
    return os.getenv("ENVIRONMENT", "development").lower() in ("development", "dev", "local")


def validate_jwt_secret_at_startup() -> None:
    secret = os.getenv("JWT_SECRET_KEY", "ksw-dev-secret-change-in-production")
    if is_production() and (not secret or secret == "ksw-dev-secret-change-in-production"):
        raise RuntimeError("JWT_SECRET_KEY doit être défini en production.")


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


def cors_headers(origin: Optional[str]) -> Dict[str, str]:
    headers = {
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
        "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, X-Requested-With",
        "Cache-Control": "no-cache, no-store, must-revalidate",
    }
    if origin and is_origin_allowed(origin):
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    elif is_development() and not origin:
        headers["Access-Control-Allow-Origin"] = "*"
    return headers


def check_rate_limit(key: str, *, max_attempts: int = 10, window_seconds: int = 900) -> None:
    now = time.time()
    bucket = [t for t in _rate_buckets[key] if now - t < window_seconds]
    if len(bucket) >= max_attempts:
        raise HTTPException(status_code=429, detail="Trop de tentatives. Réessayez plus tard.")
    bucket.append(now)
    _rate_buckets[key] = bucket
    if len(_rate_buckets) > 5000:
        stale_keys = [
            stale_key
            for stale_key, timestamps in _rate_buckets.items()
            if not timestamps or now - timestamps[-1] > window_seconds
        ]
        for stale_key in stale_keys[:1000]:
            _rate_buckets.pop(stale_key, None)


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
