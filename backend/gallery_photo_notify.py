"""Notifications client lors de l'ajout de photos dans une galerie."""

from __future__ import annotations

import json
import uuid
from datetime import datetime
from typing import Any, Dict, List, Set

from sqlalchemy.orm import Session

from models import Gallery, Setting

GALLERY_PHOTO_NOTIFICATIONS_KEY = "gallery_photo_notifications"


def _photo_ids(photos: Any) -> Set[str]:
    ids: Set[str] = set()
    if not isinstance(photos, list):
        return ids
    for photo in photos:
        if isinstance(photo, dict) and photo.get("id"):
            ids.add(str(photo["id"]))
    return ids


def detect_gallery_photo_uploads(
    old_galleries: List[Gallery],
    incoming: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    old_by_id = {g.id: g for g in old_galleries}
    pending: List[Dict[str, Any]] = []

    for item in incoming:
        gallery_id = str(item.get("id") or "")
        if not gallery_id:
            continue

        new_photos = item.get("photos", []) or []
        new_ids = _photo_ids(new_photos)
        old = old_by_id.get(gallery_id)
        if not old:
            if new_ids and (item.get("clientEmail") or "").strip():
                pending.append(_build_pending(item, gallery_id, len(new_ids), password=None))
            continue

        old_ids = _photo_ids(old.photos or [])
        added_ids = new_ids - old_ids
        client_email = (item.get("clientEmail") or old.client_email or "").strip()
        if added_ids and client_email:
            pending.append(
                _build_pending(
                    item,
                    gallery_id,
                    len(added_ids),
                    password=item.get("password") or old.password,
                    fallback=old,
                )
            )

    return pending


def _build_pending(
    item: Dict[str, Any],
    gallery_id: str,
    added_count: int,
    *,
    password: str | None,
    fallback: Gallery | None = None,
) -> Dict[str, Any]:
    return {
        "galleryId": gallery_id,
        "addedCount": added_count,
        "title": item.get("title") or (fallback.title if fallback else "Galerie"),
        "clientEmail": (item.get("clientEmail") or (fallback.client_email if fallback else "") or "").strip(),
        "accessKey": item.get("accessKey") or (fallback.access_key if fallback else ""),
        "password": password or (fallback.password if fallback else "") or "",
        "bookingId": item.get("bookingId") or (getattr(fallback, "booking_id", None) if fallback else None),
    }


def append_gallery_photo_notification(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
    row = db.query(Setting).filter(Setting.key == GALLERY_PHOTO_NOTIFICATIONS_KEY).first()
    items: List[Dict[str, Any]] = []
    if row and row.value:
        try:
            parsed = json.loads(row.value)
            if isinstance(parsed, list):
                items = parsed
        except Exception:
            items = []

    entry = {
        "id": f"gallery-photos-{payload.get('galleryId')}-{uuid.uuid4().hex[:8]}",
        "galleryId": payload.get("galleryId"),
        "clientEmail": payload.get("clientEmail"),
        "title": payload.get("title"),
        "accessKey": payload.get("accessKey"),
        "newPhotosCount": int(payload.get("addedCount") or 0),
        "createdAt": datetime.utcnow().strftime("%d/%m/%Y %H:%M"),
    }
    items.insert(0, entry)
    items = items[:200]

    val = json.dumps(items)
    if row:
        row.value = val
    else:
        db.add(Setting(key=GALLERY_PHOTO_NOTIFICATIONS_KEY, value=val, group="crm"))
    db.commit()
    return entry


def list_gallery_photo_notifications(db: Session) -> List[Dict[str, Any]]:
    row = db.query(Setting).filter(Setting.key == GALLERY_PHOTO_NOTIFICATIONS_KEY).first()
    if not row or not row.value:
        return []
    try:
        parsed = json.loads(row.value)
        if isinstance(parsed, list):
            return parsed
    except Exception:
        pass
    return []
