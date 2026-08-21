"""Cookies HttpOnly pour le JWT de session."""
from __future__ import annotations

import os

from fastapi import Response
from fastapi.responses import JSONResponse

from security import is_production

AUTH_COOKIE_NAME = os.getenv("AUTH_COOKIE_NAME", "studio_token")


def _cookie_secure() -> bool:
    if os.getenv("AUTH_COOKIE_SECURE", "").lower() in ("true", "1"):
        return True
    if os.getenv("AUTH_COOKIE_SECURE", "").lower() in ("false", "0"):
        return False
    return is_production()


def set_auth_cookie(response: Response, token: str, *, max_age_seconds: int) -> None:
    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=_cookie_secure(),
        samesite="lax",
        path="/",
        max_age=max(60, max_age_seconds),
    )


def clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(key=AUTH_COOKIE_NAME, path="/")


def build_auth_json_response(body: dict, token: str, *, max_age_hours: int) -> JSONResponse:
    """Réponse JSON + cookie HttpOnly ; token JSON uniquement en développement."""
    payload = dict(body)
    if is_production():
        payload.pop("token", None)
    else:
        payload["token"] = token
    response = JSONResponse(content=payload)
    set_auth_cookie(response, token, max_age_seconds=max(1, max_age_hours) * 3600)
    return response


def build_pre_2fa_json_response(body: dict, pre_token: str, *, max_age_minutes: int = 10) -> JSONResponse:
    """Réponse login staff en attente de 2FA — cookie + token JSON (dev)."""
    payload = dict(body)
    if is_production():
        payload.pop("token", None)
    else:
        payload["token"] = pre_token
    response = JSONResponse(content=payload)
    set_auth_cookie(response, pre_token, max_age_seconds=max(60, max_age_minutes * 60))
    return response
