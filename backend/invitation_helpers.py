"""Helpers pour le module invitations électroniques."""
from __future__ import annotations

import csv
import io
import secrets
import string
import unicodedata
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import func

from models import ElectronicInvitation, InvitationGuest

EVENT_TYPES = {
    "mariage": "Mariage",
    "anniversaire": "Anniversaire",
    "bapteme": "Baptême",
    "communion": "Communion",
    "professionnel": "Événement professionnel",
    "autre": "Autre",
}

INVITATION_STATUSES = {
    "pending": "En attente",
    "validated": "Validée",
    "rejected": "Refusée",
    "in_preparation": "En préparation",
    "active": "Active",
    "completed": "Terminée",
}

TEMPLATE_KEYS = ("elegant", "modern", "minimal", "romantic", "premium", "classic")

GUEST_RESPONSES = ("yes", "no", "maybe")


def get_practical_info(inv: ElectronicInvitation) -> Dict[str, Any]:
    customization = inv.customization if isinstance(inv.customization, dict) else {}
    practical = customization.get("practicalInfo")
    return practical if isinstance(practical, dict) else {}


def parse_rsvp_deadline(deadline_str: Optional[str]) -> Optional[date]:
    if not deadline_str or not str(deadline_str).strip():
        return None
    raw = str(deadline_str).strip()[:10]
    try:
        return date.fromisoformat(raw)
    except ValueError:
        return None


def parse_link_schedule_date(value: Optional[str]) -> Optional[date]:
    return parse_rsvp_deadline(value)


def public_link_schedule_status(inv: ElectronicInvitation) -> Tuple[bool, Optional[str]]:
    """État effectif du lien public : (disponible, raison)."""
    if not inv.link_active:
        return False, "disabled"
    today = date.today()
    active_from = parse_link_schedule_date(getattr(inv, "link_active_from", None))
    active_until = parse_link_schedule_date(getattr(inv, "link_active_until", None))
    if active_from and today < active_from:
        return False, "scheduled"
    if active_until and today > active_until:
        return False, "expired"
    return True, None


def sync_link_schedule(inv: ElectronicInvitation, db: Session) -> bool:
    """Désactive automatiquement le lien expiré. Retourne True si modifié."""
    if not inv.link_active:
        return False
    _, reason = public_link_schedule_status(inv)
    if reason != "expired":
        return False
    inv.link_active = False
    if inv.status in ("validated", "in_preparation", "active"):
        inv.status = "completed"
    inv.updated_at = datetime.utcnow()
    db.commit()
    return True


def link_schedule_to_dict(inv: ElectronicInvitation) -> Dict[str, Any]:
    available, reason = public_link_schedule_status(inv)
    return {
        "linkActiveFrom": getattr(inv, "link_active_from", None) or None,
        "linkActiveUntil": getattr(inv, "link_active_until", None) or None,
        "linkEffectiveActive": available,
        "linkScheduleStatus": reason or ("active" if available else "disabled"),
    }


def rsvp_form_status(inv: ElectronicInvitation) -> Tuple[bool, Optional[str]]:
    """Retourne (ouvert, date_limite ISO) — fermé après la date limite incluse."""
    practical = get_practical_info(inv)
    deadline = parse_rsvp_deadline(practical.get("rsvpDeadline"))
    deadline_str = practical.get("rsvpDeadline") if isinstance(practical.get("rsvpDeadline"), str) else None
    if deadline is None:
        return True, deadline_str
    if date.today() > deadline:
        return False, deadline_str
    return True, deadline_str


def normalize_guest_name(name: str) -> str:
    """Normalise un nom pour comparaison (casse, accents, espaces)."""
    cleaned = unicodedata.normalize("NFKD", (name or "").strip().lower())
    without_accents = "".join(c for c in cleaned if not unicodedata.combining(c))
    return " ".join(without_accents.split())


def get_invited_guest_names(inv: ElectronicInvitation) -> List[str]:
    practical = get_practical_info(inv)
    raw = practical.get("invitedGuestNames")
    if not isinstance(raw, list):
        return []
    return [str(n).strip() for n in raw if str(n).strip()]


def is_rsvp_restricted_to_guest_list(inv: ElectronicInvitation) -> bool:
    practical = get_practical_info(inv)
    return bool(practical.get("restrictRsvpToGuestList"))


def guest_name_on_invited_list(name: str, invited_names: List[str]) -> bool:
    norm = normalize_guest_name(name)
    if not norm:
        return False

    invited_norm = [normalize_guest_name(n) for n in invited_names if normalize_guest_name(n)]
    if norm in invited_norm:
        return True

    # Tolérance légère : "Sophie Dupont" ↔ "Dupont Sophie" ou inclusion partielle.
    norm_parts = set(norm.split())
    for candidate in invited_norm:
        candidate_parts = set(candidate.split())
        if norm_parts and norm_parts == candidate_parts:
            return True
        if norm in candidate or candidate in norm:
            return True
    return False


def verify_rsvp_guests_on_list(
    inv: ElectronicInvitation,
    full_name: str,
    companions: Optional[List[str]] = None,
) -> Optional[str]:
    """Vérifie que l'invité (et accompagnants) figurent sur la liste. Retourne un message d'erreur ou None."""
    if not is_rsvp_restricted_to_guest_list(inv):
        return None

    invited_names = get_invited_guest_names(inv)
    if not invited_names:
        return None

    names_to_check = [full_name] + [c for c in (companions or []) if (c or "").strip()]
    for raw_name in names_to_check:
        clean = (raw_name or "").strip()
        if not clean:
            continue
        if not guest_name_on_invited_list(clean, invited_names):
            return f"« {clean} » ne figure pas sur la liste des invités. Contactez les organisateurs."
    return None


def _dt_iso(value: Optional[datetime]) -> Optional[str]:
    if not value:
        return None
    return value.isoformat() + "Z"


def generate_public_token(db: Session) -> str:
    alphabet = string.ascii_uppercase + string.digits
    for _ in range(40):
        token = "".join(secrets.choice(alphabet) for _ in range(12))
        exists = db.query(ElectronicInvitation).filter(ElectronicInvitation.public_token == token).first()
        if not exists:
            return token
    return secrets.token_urlsafe(16).upper().replace("-", "")[:12]


def generate_guest_check_in_token(db: Session) -> str:
    alphabet = string.ascii_uppercase + string.digits
    for _ in range(40):
        token = "G" + "".join(secrets.choice(alphabet) for _ in range(10))
        exists = db.query(InvitationGuest).filter(InvitationGuest.check_in_token == token).first()
        if not exists:
            return token
    return "G" + secrets.token_urlsafe(12).upper().replace("-", "")[:10]


def guest_pass_url(check_in_token: str) -> str:
    import os

    base = (os.getenv("FRONTEND_URL") or os.getenv("NEXT_PUBLIC_SITE_URL") or "http://localhost:3000").rstrip("/")
    return f"{base}/invitation/pass/{check_in_token}"


def ensure_guest_check_in_token(guest: InvitationGuest, db: Session) -> None:
    if guest.response != "yes":
        guest.check_in_token = None
        return
    if not guest.check_in_token:
        guest.check_in_token = generate_guest_check_in_token(db)


def guest_pass_payload(guest: InvitationGuest, inv: ElectronicInvitation) -> Dict[str, Any]:
    token = guest.check_in_token or ""
    return {
        "guestId": guest.id,
        "fullName": guest.full_name,
        "guestCount": guest.guest_count or 1,
        "companions": guest.companions or [],
        "organizerNames": inv.organizer_names,
        "eventTypeLabel": EVENT_TYPES.get(inv.event_type, inv.event_type),
        "eventDate": inv.event_date,
        "eventTime": inv.event_time,
        "venue": inv.venue,
        "checkInToken": token,
        "passUrl": guest_pass_url(token) if token else None,
        "checkedInAt": _dt_iso(guest.checked_in_at),
    }


def invitation_to_dict(
    inv: ElectronicInvitation,
    db: Optional[Session] = None,
    *,
    include_stats: bool = False,
    guest_count: Optional[int] = None,
) -> Dict[str, Any]:
    data: Dict[str, Any] = {
        "id": inv.id,
        "clientUserId": inv.client_user_id,
        "clientEmail": inv.client_email,
        "clientName": inv.client_name,
        "eventType": inv.event_type,
        "eventTypeLabel": EVENT_TYPES.get(inv.event_type, inv.event_type),
        "status": inv.status,
        "statusLabel": INVITATION_STATUSES.get(inv.status, inv.status),
        "rejectionReason": inv.rejection_reason,
        "organizerNames": inv.organizer_names,
        "eventDate": inv.event_date,
        "eventTime": inv.event_time,
        "venue": inv.venue,
        "address": inv.address,
        "description": inv.description,
        "contact": inv.contact,
        "coverUrl": inv.cover_url,
        "logoUrl": inv.logo_url,
        "galleryUrls": inv.gallery_urls or [],
        "dressCode": inv.dress_code,
        "program": inv.program or [],
        "extraInfo": inv.extra_info,
        "mapLat": inv.map_lat,
        "mapLng": inv.map_lng,
        "templateKey": inv.template_key or "elegant",
        "customization": inv.customization or {},
        "publicToken": inv.public_token,
        "linkActive": bool(inv.link_active),
        **link_schedule_to_dict(inv),
        "phoneRequired": bool(inv.phone_required),
        "createdAt": _dt_iso(inv.created_at),
        "updatedAt": _dt_iso(inv.updated_at),
    }
    if guest_count is not None:
        data["guestResponsesCount"] = guest_count
    if include_stats and inv.id and db is not None:
        data["stats"] = compute_invitation_stats(inv.id, db)
    return data


def guest_to_dict(g: InvitationGuest) -> Dict[str, Any]:
    token = g.check_in_token or ""
    return {
        "id": g.id,
        "invitationId": g.invitation_id,
        "fullName": g.full_name,
        "phone": g.phone,
        "response": g.response,
        "guestCount": g.guest_count or 1,
        "companions": g.companions or [],
        "message": g.message,
        "preferences": g.preferences or {},
        "source": g.source,
        "checkInToken": token or None,
        "passUrl": guest_pass_url(token) if token else None,
        "checkedInAt": _dt_iso(g.checked_in_at),
        "respondedAt": _dt_iso(g.responded_at),
        "createdAt": _dt_iso(g.created_at),
        "updatedAt": _dt_iso(g.updated_at),
    }


def compute_invitation_stats(invitation_id: str, db: Session) -> Dict[str, Any]:
    guests = db.query(InvitationGuest).filter(InvitationGuest.invitation_id == invitation_id).all()
    total = len(guests)
    yes_count = sum(1 for g in guests if g.response == "yes")
    no_count = sum(1 for g in guests if g.response == "no")
    maybe_count = sum(1 for g in guests if g.response == "maybe")
    expected_people = sum((g.guest_count or 1) for g in guests if g.response == "yes")
    yes_pct = round((yes_count / total) * 100) if total else 0
    no_pct = round((no_count / total) * 100) if total else 0
    maybe_pct = round((maybe_count / total) * 100) if total else 0
    return {
        "totalResponses": total,
        "confirmed": yes_count,
        "declined": no_count,
        "pending": maybe_count,
        "expectedPeople": expected_people,
        "percentages": {"yes": yes_pct, "no": no_pct, "maybe": maybe_pct},
    }


def public_invitation_payload(inv: ElectronicInvitation) -> Dict[str, Any]:
    """Données publiques sans infos privées client."""
    customization = inv.customization or {}
    service_options = customization.get("serviceOptions") if isinstance(customization, dict) else None
    practical_info = customization.get("practicalInfo") if isinstance(customization, dict) else None
    rsvp_open, rsvp_deadline = rsvp_form_status(inv)
    return {
        "organizerNames": inv.organizer_names,
        "eventType": inv.event_type,
        "eventTypeLabel": EVENT_TYPES.get(inv.event_type, inv.event_type),
        "eventDate": inv.event_date,
        "eventTime": inv.event_time,
        "venue": inv.venue,
        "address": inv.address,
        "description": inv.description,
        "coverUrl": inv.cover_url,
        "logoUrl": inv.logo_url,
        "galleryUrls": inv.gallery_urls or [],
        "dressCode": inv.dress_code,
        "program": inv.program or [],
        "extraInfo": inv.extra_info,
        "mapLat": inv.map_lat,
        "mapLng": inv.map_lng,
        "templateKey": inv.template_key or "elegant",
        "customization": customization,
        "serviceOptions": service_options,
        "practicalInfo": practical_info if isinstance(practical_info, dict) else None,
        "phoneRequired": bool(inv.phone_required),
        **link_schedule_to_dict(inv),
        "rsvpFormOpen": rsvp_open,
        "rsvpDeadline": rsvp_deadline,
        "restrictRsvpToGuestList": is_rsvp_restricted_to_guest_list(inv),
    }


def apply_invitation_patch(inv: ElectronicInvitation, payload: Dict[str, Any]) -> None:
    field_map = {
        "eventType": "event_type",
        "status": "status",
        "rejectionReason": "rejection_reason",
        "organizerNames": "organizer_names",
        "eventDate": "event_date",
        "eventTime": "event_time",
        "venue": "venue",
        "address": "address",
        "description": "description",
        "contact": "contact",
        "coverUrl": "cover_url",
        "logoUrl": "logo_url",
        "galleryUrls": "gallery_urls",
        "dressCode": "dress_code",
        "program": "program",
        "extraInfo": "extra_info",
        "mapLat": "map_lat",
        "mapLng": "map_lng",
        "templateKey": "template_key",
        "customization": "customization",
        "linkActive": "link_active",
        "linkActiveFrom": "link_active_from",
        "linkActiveUntil": "link_active_until",
        "phoneRequired": "phone_required",
        "clientName": "client_name",
        "clientEmail": "client_email",
    }
    for api_key, col in field_map.items():
        if api_key not in payload:
            continue
        value = payload[api_key]
        if api_key in ("linkActiveFrom", "linkActiveUntil"):
            if value is None or str(value).strip() == "":
                setattr(inv, col, None)
            else:
                parsed = parse_link_schedule_date(str(value))
                setattr(inv, col, parsed.isoformat() if parsed else str(value).strip()[:10])
            continue
        if value is not None:
            setattr(inv, col, value)
    inv.updated_at = datetime.utcnow()


def _format_preferences_for_csv(prefs: Any) -> tuple:
    if not isinstance(prefs, dict):
        return "", "", ""
    persons = prefs.get("persons")
    if isinstance(persons, list) and persons:
        meals, drinks, others = [], [], []
        for i, person in enumerate(persons):
            if not isinstance(person, dict):
                continue
            prefix = f"P{i + 1}: " if len(persons) > 1 else ""
            if person.get("meal"):
                meals.append(f"{prefix}{person.get('meal')}")
            if person.get("drink"):
                drinks.append(f"{prefix}{person.get('drink')}")
            if person.get("other"):
                others.append(f"{prefix}{person.get('other')}")
        return ", ".join(meals), ", ".join(drinks), ", ".join(others)
    return str(prefs.get("meal") or ""), str(prefs.get("drink") or ""), str(prefs.get("other") or "")


def merge_invited_guest_names(existing: List[str], imported: List[str]) -> List[str]:
    """Fusionne deux listes en conservant l'ordre et en évitant les doublons."""
    merged: List[str] = []
    seen: set[str] = set()
    for raw in existing + imported:
        clean = str(raw or "").strip()
        norm = normalize_guest_name(clean)
        if not clean or not norm or norm in seen:
            continue
        seen.add(norm)
        merged.append(clean)
    return merged


def parse_invited_guest_names_from_csv(raw: bytes) -> List[str]:
    """Extrait les noms d'invités depuis un CSV (colonne Nom / Invité ou 1ère colonne)."""
    if not raw:
        return []

    text = raw.decode("utf-8-sig", errors="replace")
    if not text.strip():
        return []

    sample = text[:4096]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t")
    except csv.Error:
        dialect = csv.excel

    reader = csv.reader(io.StringIO(text), dialect)
    rows = [row for row in reader if any(str(cell).strip() for cell in row)]
    if not rows:
        return []

    header = [str(cell).strip().lower() for cell in rows[0]]
    name_idx = 0
    data_rows = rows
    for idx, label in enumerate(header):
        if label in {"nom", "name", "invité", "invite", "invites", "guest", "full_name", "fullname"}:
            name_idx = idx
            data_rows = rows[1:]
            break

    names: List[str] = []
    seen: set[str] = set()
    for row in data_rows:
        if not row:
            continue
        value = str(row[name_idx] if name_idx < len(row) else row[0]).strip()
        norm = normalize_guest_name(value)
        if not value or not norm or norm in seen:
            continue
        seen.add(norm)
        names.append(value)
    return names


def invited_guest_list_template_rows() -> List[List[str]]:
    return [
        ["Nom"],
        ["Sophie Dupont"],
        ["Alexandre Marc"],
        ["Marie Lambert"],
    ]


def guests_to_csv_rows(guests: List[InvitationGuest]) -> List[List[str]]:
    rows = [[
        "Invité", "Téléphone", "Réponse", "Nombre de personnes", "Accompagnants",
        "Repas", "Boisson", "Autre", "Message", "Date de réponse",
    ]]
    labels = {"yes": "Présent", "no": "Absent", "maybe": "En attente"}
    for g in guests:
        companions = ", ".join(g.companions or [])
        meal, drink, other = _format_preferences_for_csv(g.preferences)
        rows.append([
            g.full_name,
            g.phone or "",
            labels.get(g.response, g.response),
            str(g.guest_count or 1),
            companions,
            meal,
            drink,
            other,
            (g.message or "").replace("\n", " "),
            _dt_iso(g.responded_at) or "",
        ])
    return rows
