"""Valeurs par défaut du studio — source unique pour la devise et paramètres généraux."""

from __future__ import annotations

import re
from typing import Any, Dict

DEFAULT_STUDIO_CURRENCY = "EUR (€)"

STUDIO_SETTING_DEFAULTS: Dict[str, Any] = {
    "currency": DEFAULT_STUDIO_CURRENCY,
    "timezone": "Europe/Paris",
    "depositRate": 30,
    "studioMapLat": 48.868285,
    "studioMapLng": 2.317581,
    "studioMapZoom": 16,
}

DEFAULT_SOCIAL_LINKS: Dict[str, str] = {
    "instagram": "https://instagram.com/kswstudio",
    "facebook": "https://facebook.com/kswstudio",
    "tiktok": "",
    "youtube": "",
    "linkedin": "",
    "pinterest": "",
    "x": "",
    "whatsapp": "",
}


def merge_social_links(raw: Any) -> Dict[str, str]:
    """Retourne les liens sociaux actifs ; défauts si rien n'est configuré."""
    if not isinstance(raw, dict):
        return dict(DEFAULT_SOCIAL_LINKS)
    if all(not str(raw.get(k) or "").strip() for k in DEFAULT_SOCIAL_LINKS):
        return dict(DEFAULT_SOCIAL_LINKS)
    merged: Dict[str, str] = {}
    for key, default in DEFAULT_SOCIAL_LINKS.items():
        merged[key] = str(raw.get(key) or "").strip()
    return merged


def resolve_studio_currency(currency_str: str | None, default: str | None = None) -> str:
    fallback = default or DEFAULT_STUDIO_CURRENCY
    raw = (currency_str or "").strip()
    return raw or fallback


def parse_currency_code(currency_str: str | None) -> str:
    """Extrait le code ISO (ex. 'XOF (FCFA)' → 'xof')."""
    raw = resolve_studio_currency(currency_str)
    match = re.match(r"^([A-Za-z]{3})", raw)
    if match:
        return match.group(1).lower()
    return "eur"
