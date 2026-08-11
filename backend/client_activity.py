"""Agrégation de l'historique d'activité client pour l'admin."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session
from sqlalchemy import func

from models import User, Gallery, ElectronicInvitation
from notifications_helpers import _get_json_list, _normalize_email, BOOKINGS_KEY, CONTACT_MESSAGES_KEY
from client_presence import get_recent_activity_for_user
from invitation_helpers import INVITATION_STATUSES


def _sort_key(entry: Dict[str, Any]) -> str:
    return str(entry.get("createdAt") or entry.get("at") or "")


def build_client_activity_timeline(db: Session, *, user_id: Optional[str] = None, email: Optional[str] = None) -> Dict[str, Any]:
    user: Optional[User] = None
    if user_id:
        user = db.query(User).filter(User.id == str(user_id)).first()
    if not user and email:
        user = db.query(User).filter(func.lower(User.email) == _normalize_email(email)).first()
    if not user:
        raise ValueError("Client introuvable.")

    email_clean = _normalize_email(user.email)
    timeline: List[Dict[str, Any]] = []

    for entry in get_recent_activity_for_user(db, user.id, limit=100):
        timeline.append(
            {
                "type": "presence",
                "title": entry.get("action") or "Activité",
                "description": entry.get("detail") or "",
                "path": entry.get("path") or "",
                "location": f"{entry.get('city', '')}, {entry.get('country', '')}".strip(", "),
                "createdAt": entry.get("createdAt") or entry.get("displayAt") or "",
            }
        )

    for booking in _get_json_list(db, BOOKINGS_KEY):
        if _normalize_email(str(booking.get("email", ""))) != email_clean:
            continue
        timeline.append(
            {
                "type": "booking",
                "title": "Réservation",
                "description": f"{booking.get('serviceTitle', 'Prestation')} — {booking.get('date')} à {booking.get('time')} · {booking.get('status', 'pending')}",
                "createdAt": booking.get("createdAt") or "",
                "relatedId": booking.get("id"),
            }
        )
        if booking.get("paidAt") or booking.get("paymentStatus") == "paid":
            timeline.append(
                {
                    "type": "payment",
                    "title": "Paiement acompte",
                    "description": f"Réf. {booking.get('reference', booking.get('id', '')[:8])} — {booking.get('paymentStatus', 'paid')}",
                    "createdAt": booking.get("paidAt") or booking.get("createdAt") or "",
                    "relatedId": booking.get("id"),
                }
            )

    for msg in _get_json_list(db, CONTACT_MESSAGES_KEY):
        if _normalize_email(str(msg.get("email", ""))) != email_clean:
            continue
        timeline.append(
            {
                "type": "contact",
                "title": "Message contact",
                "description": str(msg.get("subject") or msg.get("message") or "")[:200],
                "createdAt": msg.get("createdAt") or "",
                "relatedId": msg.get("id"),
            }
        )

    galleries = (
        db.query(Gallery)
        .filter(
            Gallery.is_private == True,
            func.lower(func.coalesce(Gallery.client_email, "")) == email_clean,
        )
        .all()
    )
    for gallery in galleries:
        timeline.append(
            {
                "type": "gallery",
                "title": "Galerie privée",
                "description": f'"{gallery.title}" — clé {gallery.access_key}',
                "createdAt": gallery.updated_at.isoformat() + "Z" if gallery.updated_at else "",
                "relatedId": gallery.id,
            }
        )

    invitations = (
        db.query(ElectronicInvitation)
        .filter(
            ElectronicInvitation.deleted_at.is_(None),
            func.lower(ElectronicInvitation.client_email) == email_clean,
        )
        .all()
    )
    for inv in invitations:
        status_label = INVITATION_STATUSES.get(inv.status, inv.status)
        timeline.append(
            {
                "type": "invitation",
                "title": "Invitation électronique",
                "description": f"{inv.organizer_names} · {inv.event_date} · {status_label}",
                "createdAt": inv.created_at.isoformat() + "Z" if inv.created_at else "",
                "relatedId": inv.id,
            }
        )

    timeline.sort(key=_sort_key, reverse=True)

    return {
        "client": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "phone": getattr(user, "phone", None) or "",
            "status": user.status or "active",
            "lastLoginAt": getattr(user, "last_login_at", None).isoformat() + "Z"
            if getattr(user, "last_login_at", None)
            else None,
            "lastSeenAt": getattr(user, "last_seen_at", None).isoformat() + "Z"
            if getattr(user, "last_seen_at", None)
            else None,
            "location": {
                "city": getattr(user, "last_login_city", None) or "—",
                "country": getattr(user, "last_login_country", None) or "—",
                "ip": getattr(user, "last_login_ip", None) or "—",
            },
        },
        "timeline": timeline[:120],
        "stats": {
            "bookings": sum(1 for t in timeline if t["type"] == "booking"),
            "galleries": sum(1 for t in timeline if t["type"] == "gallery"),
            "invitations": sum(1 for t in timeline if t["type"] == "invitation"),
            "messages": sum(1 for t in timeline if t["type"] == "contact"),
            "presenceEvents": sum(1 for t in timeline if t["type"] == "presence"),
        },
    }
