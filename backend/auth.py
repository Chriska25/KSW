import os
import secrets
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from database import get_db
from models import User
from security import verify_password_hash, is_development as security_is_dev
from auth_cookies import AUTH_COOKIE_NAME
from superuser import is_superuser

JWT_SECRET = os.getenv("JWT_SECRET_KEY", "ksw-dev-secret-change-in-production")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_HOURS = int(os.getenv("JWT_ACCESS_TOKEN_HOURS", "24"))
PRE_2FA_TOKEN_MINUTES = 10

from settings_store import get_setting_bool

ADMIN_ROLES = {"admin", "photographer", "assistant"}
STAFF_ROLES = {"admin", "photographer", "assistant"}


def staff_requires_2fa(user: User, db: Session) -> bool:
    """2FA staff si réglage global actif et compte non exempté."""
    if is_superuser(user):
        return False
    role = user.role or "client"
    if role not in STAFF_ROLES:
        return False
    if not get_setting_bool(db, "force2FAForAdmin", True):
        return False
    if getattr(user, "two_factor_enabled", None) is False:
        return False
    return True


def staff_two_factor_enabled_flag(user: User, db: Session) -> bool:
    """État effectif 2FA pour l'UI admin."""
    role = user.role or "client"
    if role not in STAFF_ROLES:
        return False
    if getattr(user, "two_factor_enabled", None) is False:
        return False
    if not get_setting_bool(db, "force2FAForAdmin", True):
        return False
    return True

from pending_auth_store import clear_2fa_code, consume_2fa_code, store_2fa_code

from password_reset_store import consume_password_reset_token as _consume_reset_token
from password_reset_store import store_password_reset_token

RESET_TOKEN_HOURS = 1
_bearer = HTTPBearer(auto_error=False)


def is_development() -> bool:
    return security_is_dev()


def _user_payload(user: User) -> Dict[str, Any]:
    role = user.role or "client"
    payload = {
        "id": user.id,
        "name": user.name,
        "firstName": user.first_name or "",
        "lastName": user.last_name or "",
        "email": user.email,
        "phone": getattr(user, "phone", None) or "",
        "avatarUrl": getattr(user, "avatar_url", None) or "",
        "role": role,
        "status": user.status or "active",
        "roles": [{"name": role}],
    }
    if is_superuser(user):
        payload["isSuperuser"] = True
    return payload


def create_access_token(
    user: User,
    *,
    two_fa_verified: bool = True,
    hours: Optional[int] = None,
    db: Optional[Session] = None,
) -> str:
    role = user.role or "client"
    requires_2fa = staff_requires_2fa(user, db) if db is not None else role in STAFF_ROLES
    token_hours = hours if hours is not None else ACCESS_TOKEN_HOURS
    payload = {
        "sub": user.id,
        "email": user.email,
        "role": role,
        "2fa_verified": two_fa_verified or not requires_2fa,
        "exp": datetime.utcnow() + timedelta(hours=max(1, token_hours)),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_pre_2fa_token(user: User) -> str:
    payload = {
        "sub": user.id,
        "email": user.email,
        "role": user.role or "admin",
        "2fa_verified": False,
        "pre_2fa": True,
        "exp": datetime.utcnow() + timedelta(minutes=PRE_2FA_TOKEN_MINUTES),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> Dict[str, Any]:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])


def issue_2fa_code(user_id: str) -> str:
    code = f"{secrets.randbelow(900000) + 100000:06d}"
    store_2fa_code(user_id, code, minutes=PRE_2FA_TOKEN_MINUTES)
    if is_development():
        print(f"[DEV 2FA] Code pour {user_id}: {code} (123456 accepté en dev)")
    return code


def issue_password_reset_token(user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    store_password_reset_token(token, user_id, hours=RESET_TOKEN_HOURS)
    return token


def consume_password_reset_token(token: str) -> Optional[str]:
    return _consume_reset_token(token)


def verify_2fa_code(user_id: str, code: str) -> bool:
    clean = (code or "").strip()
    if is_development() and clean == "123456":
        clear_2fa_code(user_id)
        return True
    return consume_2fa_code(user_id, clean)


def verify_password(user: User, password: str) -> bool:
    if not password or not user:
        return False
    return verify_password_hash(user.password or "", password)


def get_token_from_credentials(
    credentials: Optional[HTTPAuthorizationCredentials],
) -> Optional[str]:
    if not credentials or credentials.scheme.lower() != "bearer":
        return None
    token = credentials.credentials
    if not token or token.startswith("demo-token-") or token.startswith("demo-2fa-token-"):
        return None
    if not is_development() and token.startswith("fastapi-token-"):
        return None
    return token


def resolve_token(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials],
) -> Optional[str]:
    token = get_token_from_credentials(credentials)
    if token:
        return token
    cookie_token = request.cookies.get(AUTH_COOKIE_NAME)
    if cookie_token and len(cookie_token) > 10:
        return cookie_token
    return None


def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    token = resolve_token(request, credentials)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentification requise.")

    try:
        payload = decode_token(token)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session invalide ou expirée.")

    if payload.get("pre_2fa"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Validation 2FA requise.")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalide.")

    user = db.query(User).filter(User.id == str(user_id)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Utilisateur introuvable.")

    if (user.status or "active") == "suspended":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Compte suspendu.")

    role = user.role or "client"
    if staff_requires_2fa(user, db) and not payload.get("2fa_verified"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Validation 2FA requise.")

    return user


def require_admin_user(current_user: User = Depends(get_current_user)) -> User:
    role = current_user.role or "client"
    if role not in ADMIN_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès administrateur requis.")
    return current_user


def require_super_admin(current_user: User = Depends(get_current_user)) -> User:
    if (current_user.role or "client") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès réservé à l'administrateur principal.")
    return current_user


def require_superuser(current_user: User = Depends(get_current_user)) -> User:
    if not is_superuser(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Action réservée au super administrateur système.",
        )
    return current_user


def serialize_user(user: User) -> Dict[str, Any]:
    return _user_payload(user)
