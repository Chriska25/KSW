"""Tokens de réinitialisation mot de passe — persistance DB (survit aux redémarrages)."""
from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import text

from database import engine

DEFAULT_TTL_HOURS = 1


def ensure_password_reset_table() -> None:
    try:
        with engine.begin() as conn:
            conn.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS password_reset_tokens (
                        token VARCHAR(128) PRIMARY KEY,
                        user_id VARCHAR(128) NOT NULL,
                        expires_at TIMESTAMP NOT NULL
                    )
                    """
                )
            )
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_password_reset_tokens_user_id "
                    "ON password_reset_tokens (user_id)"
                )
            )
    except Exception as exc:
        print(f"[MIGRATION] password_reset_tokens: {exc}")


def store_password_reset_token(token: str, user_id: str, *, hours: int = DEFAULT_TTL_HOURS) -> None:
    ensure_password_reset_table()
    expires = datetime.utcnow() + timedelta(hours=hours)
    with engine.begin() as conn:
        conn.execute(
            text("DELETE FROM password_reset_tokens WHERE user_id = :user_id"),
            {"user_id": str(user_id)},
        )
        conn.execute(
            text(
                """
                INSERT INTO password_reset_tokens (token, user_id, expires_at)
                VALUES (:token, :user_id, :expires_at)
                """
            ),
            {"token": token, "user_id": str(user_id), "expires_at": expires},
        )


def consume_password_reset_token(token: str) -> str | None:
    ensure_password_reset_table()
    clean = (token or "").strip()
    if not clean:
        return None
    now = datetime.utcnow()
    with engine.begin() as conn:
        row = conn.execute(
            text("SELECT user_id, expires_at FROM password_reset_tokens WHERE token = :token"),
            {"token": clean},
        ).fetchone()
        if not row:
            return None
        user_id, expires_at = row[0], row[1]
        conn.execute(
            text("DELETE FROM password_reset_tokens WHERE token = :token"),
            {"token": clean},
        )
        if now > expires_at:
            return None
        return str(user_id)
