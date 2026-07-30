import json
from typing import Any, Dict, List, Set, Optional

from sqlalchemy.orm import Session
from sqlalchemy import func

from models import Setting, Gallery

BOOKINGS_KEY = "bookings"
CONTACT_MESSAGES_KEY = "contact_messages"
CLIENT_NOTIFICATIONS_READ_KEY = "client_notifications_read"


def _get_json_list(db: Session, key: str) -> List[Dict[str, Any]]:
    row = db.query(Setting).filter(Setting.key == key).first()
    if row and row.value:
        try:
            parsed = json.loads(row.value)
            if isinstance(parsed, list):
                return parsed
        except Exception:
            pass
    return []


def _normalize_email(email: str) -> str:
    clean = (email or "").lower().strip()
    if clean == "client@kswstudio.fr":
        return "sophie.d@email.com"
    return clean


def _get_client_read_map(db: Session) -> Dict[str, List[str]]:
    row = db.query(Setting).filter(Setting.key == CLIENT_NOTIFICATIONS_READ_KEY).first()
    if row and row.value:
        try:
            parsed = json.loads(row.value)
            if isinstance(parsed, dict):
                return {str(k).lower(): list(v) for k, v in parsed.items()}
        except Exception:
            pass
    return {}


def _save_client_read_map(db: Session, data: Dict[str, List[str]]) -> None:
    val = json.dumps(data)
    row = db.query(Setting).filter(Setting.key == CLIENT_NOTIFICATIONS_READ_KEY).first()
    if row:
        row.value = val
    else:
        db.add(Setting(key=CLIENT_NOTIFICATIONS_READ_KEY, value=val, group="crm"))
    db.commit()


def build_client_notifications(db: Session, user_email: str) -> List[Dict[str, Any]]:
    email_clean = _normalize_email(user_email)
    read_map = _get_client_read_map(db)
    read_ids: Set[str] = set(read_map.get(email_clean, []))
    notifications: List[Dict[str, Any]] = []

    for b in _get_json_list(db, BOOKINGS_KEY):
        b_email = _normalize_email(str(b.get("email", "")))
        if b_email != email_clean:
            continue
        bid = str(b.get("id", ""))
        ref = b.get("reference", bid[:8])
        name = f"{b.get('firstName', '')} {b.get('lastName', '')}".strip()

        notifications.append({
            "id": f"booking-{bid}",
            "type": "booking",
            "title": "Demande de réservation enregistrée",
            "message": f"{b.get('serviceTitle')} — {b.get('date')} à {b.get('time')} (réf. {ref})",
            "createdAt": b.get("createdAt", ""),
            "read": f"booking-{bid}" in read_ids,
            "relatedId": bid,
        })

        if b.get("paymentStatus") == "paid":
            notifications.append({
                "id": f"payment-{bid}",
                "type": "payment",
                "title": "Acompte confirmé",
                "message": f"Votre acompte pour {ref} a été reçu. Séance confirmée le {b.get('date')}.",
                "createdAt": b.get("paidAt") or b.get("createdAt", ""),
                "read": f"payment-{bid}" in read_ids,
                "relatedId": bid,
            })

        status = b.get("status")
        if status == "confirmed" and b.get("paymentStatus") != "paid":
            notifications.append({
                "id": f"confirmed-{bid}",
                "type": "booking",
                "title": "Réservation confirmée par le studio",
                "message": f"Votre séance {ref} du {b.get('date')} est confirmée.",
                "createdAt": b.get("createdAt", ""),
                "read": f"confirmed-{bid}" in read_ids,
                "relatedId": bid,
            })

    galleries = (
        db.query(Gallery)
        .filter(
            Gallery.is_private == True,
            func.lower(func.coalesce(Gallery.client_email, "")) == email_clean,
        )
        .all()
    )
    for g in galleries:
        gid = str(g.id)
        notifications.append({
            "id": f"gallery-{gid}",
            "type": "gallery",
            "title": "Galerie privée disponible",
            "message": f'"{g.title}" — clé d\'accès : {g.access_key}',
            "createdAt": g.updated_at.strftime("%d/%m/%Y %H:%M") if g.updated_at else "",
            "read": f"gallery-{gid}" in read_ids,
            "relatedId": gid,
            "accessKey": g.access_key,
        })

    notifications.sort(key=lambda n: str(n.get("createdAt", "")), reverse=True)
    return notifications[:50]


def mark_client_notifications_read(db: Session, user_email: str, ids: Optional[List[str]], mark_all: bool) -> None:
    email_clean = _normalize_email(user_email)
    read_map = _get_client_read_map(db)
    current = set(read_map.get(email_clean, []))

    if mark_all:
        for n in build_client_notifications(db, user_email):
            current.add(str(n.get("id")))
    elif ids:
        for nid in ids:
            current.add(str(nid))

    read_map[email_clean] = sorted(current)
    _save_client_read_map(db, read_map)
