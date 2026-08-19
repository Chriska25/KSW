"""Hash et vérification des mots de passe galerie (stockage bcrypt)."""
from __future__ import annotations

from typing import Optional

from sqlalchemy.orm import Session

from models import Gallery
from security import hash_password, verify_password_hash

_BCRYPT_PREFIX = "$2"


def is_stored_password_hash(stored: Optional[str]) -> bool:
    value = (stored or "").strip()
    return value.startswith(_BCRYPT_PREFIX)


def hash_gallery_password(plain: str) -> str:
    return hash_password((plain or "").strip())


def verify_gallery_password(stored: Optional[str], plain: Optional[str]) -> bool:
    candidate = (plain or "").strip()
    if not stored:
        return not candidate
    if is_stored_password_hash(stored):
        return verify_password_hash(stored, candidate)
    return stored == candidate


def prepare_gallery_password_for_storage(
    raw: Optional[str],
    *,
    existing: Optional[str] = None,
) -> Optional[str]:
    """Normalise un mot de passe galerie avant écriture en BDD."""
    value = (raw or "").strip()
    if not value:
        return existing or None
    if is_stored_password_hash(value):
        return value
    return hash_gallery_password(value)


def migrate_gallery_passwords(db: Session) -> int:
    """Convertit les mots de passe galerie en clair vers bcrypt."""
    updated = 0
    for gallery in db.query(Gallery).all():
        stored = (gallery.password or "").strip()
        if not stored or is_stored_password_hash(stored):
            continue
        gallery.password = hash_gallery_password(stored)
        updated += 1
    if updated:
        db.commit()
        print(f"[SECURITY] {updated} mot(s) de passe galerie migré(s) vers bcrypt.")
    return updated


def regenerate_gallery_password(db: Session, gallery: Gallery) -> str:
    """Génère un nouveau mot de passe (ex. renvoi email accès galerie)."""
    from gallery_booking_helpers import _generate_gallery_password

    plain = _generate_gallery_password()
    gallery.password = hash_gallery_password(plain)
    db.commit()
    db.refresh(gallery)
    return plain
