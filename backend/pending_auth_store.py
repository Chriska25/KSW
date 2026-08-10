"""Stockage persistant des codes 2FA (survit aux redémarrages du backend)."""
from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import text

from database import engine

DEFAULT_TTL_MINUTES = 10


def ensure_pending_auth_table() -> None:
    try:
        with engine.begin() as conn:
            conn.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS pending_auth_codes (
                        user_id VARCHAR(128) PRIMARY KEY,
                        code VARCHAR(16) NOT NULL,
                        expires_at TIMESTAMP NOT NULL
                    )
                    """
                )
            )
    except Exception as exc:
        print(f"[MIGRATION] pending_auth_codes: {exc}")


def store_2fa_code(user_id: str, code: str, *, minutes: int = DEFAULT_TTL_MINUTES) -> None:
    ensure_pending_auth_table()
    expires = datetime.utcnow() + timedelta(minutes=minutes)
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO pending_auth_codes (user_id, code, expires_at)
                VALUES (:user_id, :code, :expires_at)
                ON CONFLICT (user_id) DO UPDATE
                SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at
                """
            ),
            {"user_id": str(user_id), "code": code, "expires_at": expires},
        )


def consume_2fa_code(user_id: str, code: str) -> bool:
    ensure_pending_auth_table()
    uid = str(user_id)
    clean = (code or "").strip()
    now = datetime.utcnow()
    with engine.begin() as conn:
        row = conn.execute(
            text("SELECT code, expires_at FROM pending_auth_codes WHERE user_id = :user_id"),
            {"user_id": uid},
        ).fetchone()
        if not row:
            return False
        stored_code, expires_at = row[0], row[1]
        if now > expires_at:
            conn.execute(
                text("DELETE FROM pending_auth_codes WHERE user_id = :user_id"),
                {"user_id": uid},
            )
            return False
        if stored_code != clean:
            return False
        conn.execute(
            text("DELETE FROM pending_auth_codes WHERE user_id = :user_id"),
            {"user_id": uid},
        )
        return True


def clear_2fa_code(user_id: str) -> None:
    ensure_pending_auth_table()
    with engine.begin() as conn:
        conn.execute(
            text("DELETE FROM pending_auth_codes WHERE user_id = :user_id"),
            {"user_id": str(user_id)},
        )
