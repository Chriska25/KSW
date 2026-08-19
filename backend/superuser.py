"""Compte superUser système — invisible aux admins standards."""
import os
from typing import Optional

from sqlalchemy.orm import Session

from models import User
from security import hash_password, is_production, MIN_SUPERUSER_PASSWORD_LENGTH

SUPERUSER_ID = "ksw-superuser-system"
SUPERUSER_EMAIL = os.getenv("SUPERUSER_EMAIL", "root@kswstudio.internal").strip().lower()


def get_superuser_password() -> Optional[str]:
    pwd = (os.getenv("SUPERUSER_PASSWORD") or "").strip()
    if not pwd:
        if is_production():
            raise RuntimeError("SUPERUSER_PASSWORD doit être défini en production.")
        print("[SUPERUSER] SUPERUSER_PASSWORD non défini — compte système ignoré.")
        return None
    if is_production() and len(pwd) < MIN_SUPERUSER_PASSWORD_LENGTH:
        raise RuntimeError(
            f"SUPERUSER_PASSWORD doit contenir au moins {MIN_SUPERUSER_PASSWORD_LENGTH} caractères en production."
        )
    return pwd


def is_superuser(user: Optional[User]) -> bool:
    if not user:
        return False
    if getattr(user, "is_superuser", False):
        return True
    email = (user.email or "").strip().lower()
    return str(user.id) == SUPERUSER_ID or email == SUPERUSER_EMAIL


def ensure_superuser_column(engine) -> None:
    from sqlalchemy import inspect, text

    try:
        insp = inspect(engine)
        if "users" not in insp.get_table_names():
            return
        cols = {c["name"] for c in insp.get_columns("users")}
        if "is_superuser" in cols:
            return
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_superuser BOOLEAN DEFAULT FALSE"))
    except Exception as exc:
        print(f"[MIGRATION] is_superuser sur users: {exc}")


def ensure_superuser_account(db: Session) -> None:
    """Crée ou met à jour le compte superUser encré (hors seed public)."""
    password = get_superuser_password()
    if not password:
        return

    try:
        user = db.query(User).filter(User.id == SUPERUSER_ID).first()
        if not user:
            user = db.query(User).filter(User.email == SUPERUSER_EMAIL).first()

        password_hash = hash_password(password)

        if user:
            user.first_name = user.first_name or "Super"
            user.last_name = user.last_name or "User"
            user.email = SUPERUSER_EMAIL
            user.password = password_hash
            user.role = "admin"
            user.status = "active"
            user.is_superuser = True
        else:
            user = User(
                id=SUPERUSER_ID,
                first_name="Super",
                last_name="User",
                email=SUPERUSER_EMAIL,
                password=password_hash,
                role="admin",
                status="active",
                is_superuser=True,
            )
            db.add(user)

        db.commit()
        print(f"[SUPERUSER] Compte système actif : {SUPERUSER_EMAIL}")
    except Exception as exc:
        db.rollback()
        print(f"[SUPERUSER] Échec provisionnement compte système : {exc}")
