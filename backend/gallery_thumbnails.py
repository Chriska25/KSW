"""Génération batch des miniatures galeries."""

from __future__ import annotations

import os
from typing import Any

from sqlalchemy.orm import Session

from image_processor import ensure_thumbnail_file, resolve_photo_thumb_url


def generate_all_gallery_thumbnails(
    db: Session,
    upload_dir: str,
    *,
    dry_run: bool = False,
) -> dict[str, Any]:
    from models import Gallery

    stats: dict[str, Any] = {
        "galleries": 0,
        "photosSeen": 0,
        "generated": 0,
        "alreadyOk": 0,
        "skipped": 0,
        "updatedGalleries": 0,
        "errors": 0,
    }

    galleries = db.query(Gallery).all()
    for gallery in galleries:
        photos = gallery.photos or []
        if not isinstance(photos, list) or not photos:
            continue

        stats["galleries"] += 1
        changed = False
        next_photos = []

        for photo in photos:
            if not isinstance(photo, dict):
                next_photos.append(photo)
                continue

            p = dict(photo)
            url = str(p.get("url") or "")
            stats["photosSeen"] += 1

            if not (url.startswith("/uploads/") or url.startswith("http://") or url.startswith("https://")):
                stats["skipped"] += 1
                next_photos.append(p)
                continue

            existing = resolve_photo_thumb_url(url, p.get("thumbUrl"), upload_dir, verify_exists=True)
            if existing:
                if p.get("thumbUrl") != existing:
                    p["thumbUrl"] = existing
                    changed = True
                stats["alreadyOk"] += 1
                next_photos.append(p)
                continue

            if dry_run:
                source = os.path.join(upload_dir, url.replace("/uploads/", "", 1))
                if os.path.isfile(source):
                    stats["generated"] += 1
                else:
                    stats["skipped"] += 1
                next_photos.append(p)
                continue

            try:
                thumb = ensure_thumbnail_file(url, upload_dir)
                if thumb:
                    p["thumbUrl"] = thumb
                    changed = True
                    stats["generated"] += 1
                else:
                    stats["skipped"] += 1
            except Exception:
                stats["errors"] += 1

            next_photos.append(p)

        if changed and not dry_run:
            gallery.photos = next_photos
            stats["updatedGalleries"] += 1

    if not dry_run and stats["updatedGalleries"] > 0:
        db.commit()

    return stats
