"""Création automatique de galeries privées liées aux réservations."""

from __future__ import annotations

import secrets
import string
import uuid
from datetime import date, timedelta
from typing import Any, Dict, Optional, Tuple

from sqlalchemy.orm import Session

from models import Gallery
from gallery_password import hash_gallery_password

BOOKINGS_KEY = "bookings"


def _generate_gallery_password(length: int = 10) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def _infer_category(service_title: str) -> str:
    title_lower = (service_title or "").lower()
    if "mariage" in title_lower:
        return "mariage"
    if "corporate" in title_lower or "entreprise" in title_lower:
        return "corporate"
    return "portrait"


def _compute_expires_at(session_date: Optional[str]) -> str:
    fallback = (date.today() + timedelta(days=365)).isoformat()
    if not session_date:
        return fallback
    raw = str(session_date).strip()
    try:
        if len(raw) >= 10 and raw[4] == "-":
            session = date.fromisoformat(raw[:10])
        elif "/" in raw:
            parts = raw.split("/")
            if len(parts) == 3:
                session = date(int(parts[2]), int(parts[1]), int(parts[0]))
            else:
                return fallback
        else:
            return fallback
        return (session + timedelta(days=90)).isoformat()
    except (ValueError, IndexError):
        return fallback


def _unique_access_key(db: Session, base_key: str) -> str:
    candidate = (base_key or "GAL").upper().replace(" ", "-")
    suffix = secrets.token_urlsafe(6).upper().replace("-", "")[:8]
    candidate = f"{candidate}-{suffix}"
    if not db.query(Gallery).filter(Gallery.access_key.ilike(candidate)).first():
        return candidate
    return f"{candidate}-{secrets.token_hex(2).upper()}"


def get_gallery_for_booking(db: Session, booking_id: str) -> Optional[Gallery]:
    if not booking_id:
        return None
    gallery = db.query(Gallery).filter(Gallery.booking_id == str(booking_id)).first()
    if gallery:
        return gallery
    return None


def create_gallery_for_booking(
    db: Session,
    booking: Dict[str, Any],
    *,
    get_json_setting_list,
    find_booking_index,
    save_json_setting_list,
) -> Tuple[Optional[Gallery], Optional[str]]:
    booking_id = str(booking.get("id") or "")
    if not booking_id:
        return None, None

    existing = get_gallery_for_booking(db, booking_id)
    if existing:
        return existing, None

    ref = str(booking.get("reference") or booking_id[:8]).upper()
    client_name = f"{booking.get('firstName', '')} {booking.get('lastName', '')}".strip() or "Client"
    client_email = (booking.get("email") or "").strip()
    service_title = booking.get("serviceTitle") or "Séance photo"

    access_key = _unique_access_key(db, ref)
    plain_password = _generate_gallery_password()
    album_id = f"alb-{uuid.uuid4().hex[:8]}"

    gallery = Gallery(
        id=str(uuid.uuid4()),
        title=f"{service_title} — {client_name}",
        client_name=client_name,
        client_email=client_email or None,
        category=_infer_category(service_title),
        is_private=True,
        access_key=access_key,
        password=hash_gallery_password(plain_password),
        expires_at=_compute_expires_at(booking.get("date")),
        cover_url=None,
        booking_id=booking_id,
        albums=[
            {
                "id": album_id,
                "name": "Photos de séance",
                "photosCount": 0,
                "isPrivate": True,
            }
        ],
        photos=[],
    )
    db.add(gallery)
    db.commit()
    db.refresh(gallery)

    items = get_json_setting_list(db, BOOKINGS_KEY)
    idx = find_booking_index(items, booking_id)
    if idx >= 0:
        items[idx]["galleryId"] = gallery.id
        items[idx]["galleryAccessKey"] = gallery.access_key
        save_json_setting_list(db, BOOKINGS_KEY, items)

    return gallery, plain_password
