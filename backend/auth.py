import os
import secrets
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from database import get_db
from models import User
from security import verify_password_hash, is_development as security_is_dev

JWT_SECRET = os.getenv("JWT_SECRET_KEY", "ksw-dev-secret-change-in-production")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_HOURS = int(os.getenv("JWT_ACCESS_TOKEN_HOURS", "24"))
PRE_2FA_TOKEN_MINUTES = 10

ADMIN_ROLES = {"admin", "photographer", "assistant"}
STAFF_ROLES = {"admin", "photographer", "assistant"}

_bearer = HTTPBearer(auto_error=False)
_pending_2fa: Dict[str, Dict[str, Any]] = {}
_pending_password_reset: Dict[str, Dict[str, Any]] = {}
RESET_TOKEN_HOURS = 1


def is_development() -> bool:
    return security_is_dev()


def _user_payload(user: User) -> Dict[str, Any]:
    role = user.role or "client"
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": role,
        "status": user.status or "active",
        "roles": [{"name": role}],
    }


def create_access_token(user: User, *, two_fa_verified: bool = True) -> str:
    role = user.role or "client"
    requires_2fa = role in STAFF_ROLES
    payload = {
        "sub": user.id,
        "email": user.email,
        "role": role,
        "2fa_verified": two_fa_verified or not requires_2fa,
        "exp": datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_HOURS),
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
    _pending_2fa[user_id] = {
        "code": code,
        "expires": datetime.utcnow() + timedelta(minutes=PRE_2FA_TOKEN_MINUTES),
    }
    if is_development():
        print(f"[DEV 2FA] Code pour {user_id}: {code} (123456 accepté en dev)")
    return code


def issue_password_reset_token(user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    _pending_password_reset[token] = {
        "user_id": user_id,
        "expires": datetime.utcnow() + timedelta(hours=RESET_TOKEN_HOURS),
    }
    if is_development():
        print(f"[DEV RESET] Token pour {user_id}: {token}")
    return token


def consume_password_reset_token(token: str) -> Optional[str]:
    clean = (token or "").strip()
    if not clean:
        return None
    pending = _pending_password_reset.get(clean)
    if not pending:
        return None
    if datetime.utcnow() > pending["expires"]:
        _pending_password_reset.pop(clean, None)
        return None
    _pending_password_reset.pop(clean, None)
    return str(pending["user_id"])


def verify_2fa_code(user_id: str, code: str) -> bool:
    clean = (code or "").strip()
    if is_development() and clean == "123456":
        _pending_2fa.pop(user_id, None)
        return True

    pending = _pending_2fa.get(user_id)
    if not pending:
        return False
    if datetime.utcnow() > pending["expires"]:
        _pending_2fa.pop(user_id, None)
        return False
    if pending["code"] != clean:
        return False
    _pending_2fa.pop(user_id, None)
    return True


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


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    token = get_token_from_credentials(credentials)
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
    if role in STAFF_ROLES and not payload.get("2fa_verified"):
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


def serialize_user(user: User) -> Dict[str, Any]:
    return _user_payload(user)
