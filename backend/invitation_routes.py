"""Routes API — invitations électroniques."""
from __future__ import annotations

import csv
import io
import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, Request, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import ElectronicInvitation, InvitationGuest, User
from auth import get_current_user, require_admin_user
from geoip import extract_client_ip
from security import check_rate_limit
from image_processor import is_image_upload, save_raw_image_bytes
from invitation_notify import (
    bg_invitation_subscribed,
    bg_invitation_validated,
    bg_invitation_rejected,
    bg_invitation_ready,
    bg_invitation_rsvp,
)
from invitation_helpers import (
    EVENT_TYPES,
    INVITATION_STATUSES,
    TEMPLATE_KEYS,
    GUEST_RESPONSES,
    apply_invitation_patch,
    compute_invitation_stats,
    generate_public_token,
    guest_to_dict,
    guests_to_csv_rows,
    invitation_to_dict,
    public_invitation_payload,
    rsvp_form_status,
    verify_rsvp_guests_on_list,
    parse_invited_guest_names_from_csv,
    merge_invited_guest_names,
    invited_guest_list_template_rows,
    get_invited_guest_names,
    sync_link_schedule,
    public_link_schedule_status,
    parse_link_schedule_date,
    ensure_guest_check_in_token,
    guest_pass_payload,
    guest_pass_url,
)
from invitation_pdf import (
    build_system_invitation_pdf,
    build_guest_pass_pdf,
    overlay_qr_on_pdf,
    pdf_filename,
    guest_pass_pdf_filename,
    public_invitation_url,
)

router = APIRouter(prefix="/api/v1", tags=["invitations"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
MAX_INVITATION_IMAGE_BYTES = 8 * 1024 * 1024
MAX_INVITATION_PDF_BYTES = 15 * 1024 * 1024


# --- Schemas ---


class InvitationSubscribeRequest(BaseModel):
    eventType: str = "mariage"
    organizerNames: str
    eventDate: str
    eventTime: Optional[str] = None
    venue: Optional[str] = None
    address: Optional[str] = None
    description: Optional[str] = None
    contact: Optional[str] = None
    coverUrl: Optional[str] = None
    logoUrl: Optional[str] = None
    galleryUrls: Optional[List[str]] = None
    dressCode: Optional[str] = None
    program: Optional[List[Dict[str, Any]]] = None
    extraInfo: Optional[str] = None
    mapLat: Optional[float] = None
    mapLng: Optional[float] = None
    customization: Optional[Dict[str, Any]] = None
    templateKey: Optional[str] = "elegant"
    phoneRequired: Optional[bool] = False


class InvitationAdminUpdate(BaseModel):
    eventType: Optional[str] = None
    status: Optional[str] = None
    rejectionReason: Optional[str] = None
    organizerNames: Optional[str] = None
    eventDate: Optional[str] = None
    eventTime: Optional[str] = None
    venue: Optional[str] = None
    address: Optional[str] = None
    description: Optional[str] = None
    contact: Optional[str] = None
    coverUrl: Optional[str] = None
    logoUrl: Optional[str] = None
    galleryUrls: Optional[List[str]] = None
    dressCode: Optional[str] = None
    program: Optional[List[Dict[str, Any]]] = None
    extraInfo: Optional[str] = None
    mapLat: Optional[float] = None
    mapLng: Optional[float] = None
    templateKey: Optional[str] = None
    customization: Optional[Dict[str, Any]] = None
    linkActive: Optional[bool] = None
    linkActiveFrom: Optional[str] = None
    linkActiveUntil: Optional[str] = None
    phoneRequired: Optional[bool] = None
    clientName: Optional[str] = None
    clientEmail: Optional[str] = None


class GuestRsvpRequest(BaseModel):
    fullName: str = Field(min_length=2, max_length=200)
    phone: Optional[str] = None
    response: str = "maybe"
    guestCount: int = Field(default=1, ge=1, le=3)
    companions: Optional[List[str]] = None
    message: Optional[str] = Field(default=None, max_length=2000)
    preferences: Optional[Dict[str, Any]] = None


class GuestAdminUpsert(BaseModel):
    fullName: str
    phone: Optional[str] = None
    response: str = "maybe"
    guestCount: int = Field(default=1, ge=1, le=3)
    companions: Optional[List[str]] = None
    message: Optional[str] = None


def _require_client_user(user: User) -> None:
    if (user.role or "client") != "client":
        raise HTTPException(status_code=403, detail="Accès réservé aux clients.")


def _normalize_email(email: str) -> str:
    return (email or "").lower().strip()


def _get_invitation_or_404(db: Session, invitation_id: str) -> ElectronicInvitation:
    inv = (
        db.query(ElectronicInvitation)
        .filter(ElectronicInvitation.id == invitation_id, ElectronicInvitation.deleted_at.is_(None))
        .first()
    )
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation introuvable.")
    return inv


def _get_invitation_by_token(db: Session, token: str) -> ElectronicInvitation:
    clean = (token or "").strip().upper()
    if not clean or len(clean) < 8:
        raise HTTPException(status_code=404, detail="Lien d'invitation invalide.")
    inv = (
        db.query(ElectronicInvitation)
        .filter(
            ElectronicInvitation.public_token == clean,
            ElectronicInvitation.deleted_at.is_(None),
        )
        .first()
    )
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation introuvable.")
    sync_link_schedule(inv, db)
    db.refresh(inv)
    available, reason = public_link_schedule_status(inv)
    if not available:
        if reason == "expired":
            raise HTTPException(status_code=403, detail="Ce lien d'invitation a expiré.")
        if reason == "scheduled":
            raise HTTPException(status_code=403, detail="Ce lien d'invitation n'est pas encore actif.")
        raise HTTPException(status_code=403, detail="Ce lien d'invitation est désactivé.")
    if inv.status not in ("validated", "in_preparation", "active", "completed"):
        raise HTTPException(status_code=403, detail="Cette invitation n'est pas encore disponible.")
    return inv


def _guest_counts(db: Session, invitation_ids: List[str]) -> Dict[str, int]:
    if not invitation_ids:
        return {}
    rows = (
        db.query(InvitationGuest.invitation_id, func.count(InvitationGuest.id))
        .filter(InvitationGuest.invitation_id.in_(invitation_ids))
        .group_by(InvitationGuest.invitation_id)
        .all()
    )
    return {str(iid): int(cnt) for iid, cnt in rows}


def _get_guest_by_check_in_token(db: Session, token: str) -> tuple[InvitationGuest, ElectronicInvitation]:
    clean = (token or "").strip().upper()
    if not clean or len(clean) < 8:
        raise HTTPException(status_code=404, detail="Billet introuvable.")
    guest = db.query(InvitationGuest).filter(InvitationGuest.check_in_token == clean).first()
    if not guest:
        raise HTTPException(status_code=404, detail="Billet introuvable.")
    if guest.response != "yes":
        raise HTTPException(status_code=403, detail="Ce billet n'est pas valide.")
    inv = (
        db.query(ElectronicInvitation)
        .filter(ElectronicInvitation.id == guest.invitation_id, ElectronicInvitation.deleted_at.is_(None))
        .first()
    )
    if not inv:
        raise HTTPException(status_code=404, detail="Événement introuvable.")
    if inv.status in ("pending", "rejected"):
        raise HTTPException(status_code=403, detail="Cette invitation n'est pas encore active.")
    return guest, inv


def _commit_guest_with_pass(guest: InvitationGuest, db: Session) -> InvitationGuest:
    ensure_guest_check_in_token(guest, db)
    db.commit()
    db.refresh(guest)
    return guest


def _require_public_token(inv: ElectronicInvitation) -> str:
    if not inv.public_token:
        raise HTTPException(status_code=400, detail="Générez d'abord le lien public.")
    return inv.public_token


def _save_pdf_template_bytes(content: bytes, invitation_id: str) -> str:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    filename = f"invitation-template-{invitation_id}.pdf"
    path = os.path.join(UPLOAD_DIR, filename)
    with open(path, "wb") as handle:
        handle.write(content)
    return f"/uploads/{filename}"


def _load_pdf_template_bytes(template_url: str) -> bytes:
    if not template_url.startswith("/uploads/"):
        raise HTTPException(status_code=400, detail="Modèle PDF invalide.")
    path = os.path.join(UPLOAD_DIR, template_url.replace("/uploads/", "", 1))
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Modèle PDF introuvable.")
    with open(path, "rb") as handle:
        return handle.read()


def _append_manual_notification(db: Session, title: str, message: str, ntype: str = "invitation") -> None:
    import json
    from models import Setting

    key = "admin_notifications_manual"
    row = db.query(Setting).filter(Setting.key == key).first()
    items: List[Dict[str, Any]] = []
    if row and row.value:
        try:
            parsed = json.loads(row.value)
            if isinstance(parsed, list):
                items = parsed
        except Exception:
            pass
    entry = {
        "id": f"manual-{datetime.utcnow().timestamp()}",
        "type": ntype,
        "title": title,
        "message": message,
        "createdAt": datetime.utcnow().isoformat() + "Z",
        "channels": ["internal"],
    }
    items.insert(0, entry)
    val = json.dumps(items)
    if row:
        row.value = val
    else:
        db.add(Setting(key=key, value=val, group="crm"))
    db.commit()


# --- Client ---


@router.post("/invitations/guest-upload-image")
async def guest_upload_invitation_image(
    request: Request,
    file: UploadFile = File(...),
):
    """Upload visuel invitation sans connexion (parcours public, sans filigrane)."""
    client_ip = extract_client_ip(request)
    check_rate_limit(f"invitation_guest_upload:{client_ip}", max_attempts=30, window_seconds=3600)
    content = await file.read()
    if not is_image_upload(file.content_type, file.filename or ""):
        raise HTTPException(status_code=400, detail="Veuillez téléverser une image (JPEG, PNG ou WebP).")
    if len(content) > MAX_INVITATION_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image trop volumineuse (max 8 Mo).")
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    url, size = save_raw_image_bytes(content, UPLOAD_DIR)
    return {"status": "success", "url": url, "filename": os.path.basename(url), "size": size}


@router.post("/client/invitations/upload-image")
async def upload_invitation_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload photo de couverture / logo (client, sans filigrane)."""
    _require_client_user(current_user)
    content = await file.read()
    if not is_image_upload(file.content_type, file.filename or ""):
        raise HTTPException(status_code=400, detail="Veuillez téléverser une image (JPEG, PNG ou WebP).")
    if len(content) > MAX_INVITATION_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image trop volumineuse (max 8 Mo).")
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    url, size = save_raw_image_bytes(content, UPLOAD_DIR)
    return {"status": "success", "url": url, "filename": os.path.basename(url), "size": size}


@router.get("/client/invitations")
def list_client_invitations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_client_user(current_user)
    email = _normalize_email(current_user.email)
    rows = (
        db.query(ElectronicInvitation)
        .filter(
            ElectronicInvitation.deleted_at.is_(None),
            func.lower(ElectronicInvitation.client_email) == email,
        )
        .order_by(ElectronicInvitation.created_at.desc())
        .all()
    )
    counts = _guest_counts(db, [r.id for r in rows])
    return {
        "data": [
            invitation_to_dict(r, db, include_stats=True, guest_count=counts.get(r.id, 0))
            for r in rows
        ]
    }


@router.post("/client/invitations/subscribe")
def subscribe_invitation_service(
    payload: InvitationSubscribeRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_client_user(current_user)
    if payload.eventType not in EVENT_TYPES:
        raise HTTPException(status_code=400, detail="Type d'événement invalide.")

    client_name = f"{current_user.first_name or ''} {current_user.last_name or ''}".strip() or current_user.email
    inv = ElectronicInvitation(
        client_user_id=current_user.id,
        client_email=_normalize_email(current_user.email),
        client_name=client_name,
        event_type=payload.eventType,
        status="pending",
        organizer_names=payload.organizerNames.strip(),
        event_date=payload.eventDate.strip(),
        event_time=(payload.eventTime or "").strip() or None,
        venue=(payload.venue or "").strip() or None,
        address=(payload.address or "").strip() or None,
        description=(payload.description or "").strip() or None,
        contact=(payload.contact or current_user.phone or "").strip() or None,
        cover_url=payload.coverUrl,
        logo_url=payload.logoUrl,
        gallery_urls=payload.galleryUrls or [],
        dress_code=(payload.dressCode or "").strip() or None,
        program=payload.program or [],
        extra_info=(payload.extraInfo or "").strip() or None,
        map_lat=payload.mapLat,
        map_lng=payload.mapLng,
        template_key=payload.templateKey if payload.templateKey in TEMPLATE_KEYS else "elegant",
        customization=payload.customization or {},
        link_active=False,
        phone_required=bool(payload.phoneRequired),
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)

    _append_manual_notification(
        db,
        "Nouvelle demande d'invitation électronique",
        f"{client_name} — {EVENT_TYPES.get(payload.eventType, payload.eventType)} le {payload.eventDate}",
    )
    background_tasks.add_task(bg_invitation_subscribed, inv.id)
    return {
        "status": "success",
        "message": "Demande enregistrée — en attente de validation par le studio.",
        "data": invitation_to_dict(inv, db),
    }


@router.get("/client/invitations/{invitation_id}")
def get_client_invitation(
    invitation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_client_user(current_user)
    inv = _get_invitation_or_404(db, invitation_id)
    if _normalize_email(inv.client_email) != _normalize_email(current_user.email):
        raise HTTPException(status_code=403, detail="Accès refusé.")
    guests = db.query(InvitationGuest).filter(InvitationGuest.invitation_id == inv.id).all()
    data = invitation_to_dict(inv, db, include_stats=True, guest_count=len(guests))
    data["guests"] = [guest_to_dict(g) for g in guests]
    return {"data": data}


# --- Admin ---


@router.get("/admin/invitations")
def list_admin_invitations(
    status: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    _admin: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    query = db.query(ElectronicInvitation).filter(ElectronicInvitation.deleted_at.is_(None))
    if status and status != "all":
        query = query.filter(ElectronicInvitation.status == status)
    if q:
        like = f"%{q.strip().lower()}%"
        query = query.filter(
            func.lower(ElectronicInvitation.client_name).like(like)
            | func.lower(ElectronicInvitation.organizer_names).like(like)
            | func.lower(ElectronicInvitation.client_email).like(like)
        )
    rows = query.order_by(ElectronicInvitation.created_at.desc()).all()
    for inv in rows:
        sync_link_schedule(inv, db)
    counts = _guest_counts(db, [r.id for r in rows])
    return {
        "data": [
            invitation_to_dict(r, db, guest_count=counts.get(r.id, 0))
            for r in rows
        ],
        "meta": {"eventTypes": EVENT_TYPES, "statuses": INVITATION_STATUSES, "templates": list(TEMPLATE_KEYS)},
    }


@router.get("/admin/invitations/guest-list/template.csv")
def download_guest_list_template(_admin: User = Depends(require_admin_user)):
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    for row in invited_guest_list_template_rows():
        writer.writerow(row)
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="modele-liste-invites.csv"'},
    )


@router.get("/admin/invitations/{invitation_id}")
def get_admin_invitation(
    invitation_id: str,
    _admin: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    inv = _get_invitation_or_404(db, invitation_id)
    sync_link_schedule(inv, db)
    guests = (
        db.query(InvitationGuest)
        .filter(InvitationGuest.invitation_id == inv.id)
        .order_by(InvitationGuest.responded_at.desc())
        .all()
    )
    changed = False
    for guest in guests:
        if guest.response == "yes" and not guest.check_in_token:
            ensure_guest_check_in_token(guest, db)
            changed = True
    if changed:
        db.commit()
        guests = (
            db.query(InvitationGuest)
            .filter(InvitationGuest.invitation_id == inv.id)
            .order_by(InvitationGuest.responded_at.desc())
            .all()
        )
    data = invitation_to_dict(inv, db, include_stats=True, guest_count=len(guests))
    data["guests"] = [guest_to_dict(g) for g in guests]
    return {"data": data}


@router.patch("/admin/invitations/{invitation_id}")
def update_admin_invitation(
    invitation_id: str,
    payload: InvitationAdminUpdate,
    _admin: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    inv = _get_invitation_or_404(db, invitation_id)
    patch = payload.model_dump(exclude_unset=True)
    if patch.get("status") and patch["status"] not in INVITATION_STATUSES:
        raise HTTPException(status_code=400, detail="Statut invalide.")
    if patch.get("templateKey") and patch["templateKey"] not in TEMPLATE_KEYS:
        raise HTTPException(status_code=400, detail="Modèle invalide.")
    from_date = patch.get("linkActiveFrom")
    until_date = patch.get("linkActiveUntil")
    if "linkActiveFrom" in patch and from_date:
        if parse_link_schedule_date(from_date) is None:
            raise HTTPException(status_code=400, detail="Date de début de validité invalide.")
    if "linkActiveUntil" in patch and until_date:
        if parse_link_schedule_date(until_date) is None:
            raise HTTPException(status_code=400, detail="Date de fin de validité invalide.")
    parsed_from = parse_link_schedule_date(from_date) if from_date else parse_link_schedule_date(inv.link_active_from)
    parsed_until = parse_link_schedule_date(until_date) if until_date else parse_link_schedule_date(inv.link_active_until)
    if parsed_from and parsed_until and parsed_from > parsed_until:
        raise HTTPException(status_code=400, detail="La date de début doit être antérieure à la date de fin.")
    apply_invitation_patch(inv, patch)
    db.commit()
    db.refresh(inv)
    return {"status": "success", "data": invitation_to_dict(inv, db, include_stats=True)}


@router.post("/admin/invitations/{invitation_id}/validate")
def validate_invitation(
    invitation_id: str,
    background_tasks: BackgroundTasks,
    _admin: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    inv = _get_invitation_or_404(db, invitation_id)
    inv.status = "validated"
    inv.rejection_reason = None
    inv.updated_at = datetime.utcnow()
    db.commit()
    background_tasks.add_task(bg_invitation_validated, inv.id)
    return {"status": "success", "message": "Demande validée.", "data": invitation_to_dict(inv, db)}


@router.post("/admin/invitations/{invitation_id}/reject")
def reject_invitation(
    invitation_id: str,
    background_tasks: BackgroundTasks,
    reason: Optional[str] = Query(None),
    _admin: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    inv = _get_invitation_or_404(db, invitation_id)
    inv.status = "rejected"
    inv.rejection_reason = (reason or "").strip() or "Demande refusée par le studio."
    inv.link_active = False
    inv.updated_at = datetime.utcnow()
    db.commit()
    background_tasks.add_task(bg_invitation_rejected, inv.id, inv.rejection_reason or "")
    return {"status": "success", "message": "Demande refusée.", "data": invitation_to_dict(inv, db)}


@router.post("/admin/invitations/{invitation_id}/generate-link")
def generate_invitation_link(
    invitation_id: str,
    background_tasks: BackgroundTasks,
    _admin: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    inv = _get_invitation_or_404(db, invitation_id)
    if inv.status in ("pending", "rejected"):
        raise HTTPException(status_code=400, detail="Validez la demande avant de générer le lien.")
    if not inv.public_token:
        inv.public_token = generate_public_token(db)
    inv.link_active = True
    if inv.status == "validated":
        inv.status = "in_preparation"
    inv.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(inv)
    background_tasks.add_task(bg_invitation_ready, inv.id)
    return {
        "status": "success",
        "message": "Lien généré.",
        "data": invitation_to_dict(inv, db),
        "publicPath": f"/invitation/{inv.public_token}",
    }


@router.post("/admin/invitations/{invitation_id}/toggle-link")
def toggle_invitation_link(
    invitation_id: str,
    active: bool = Query(...),
    _admin: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    inv = _get_invitation_or_404(db, invitation_id)
    if active and not inv.public_token:
        raise HTTPException(status_code=400, detail="Générez d'abord le lien.")
    inv.link_active = active
    if active:
        if inv.status in ("validated", "in_preparation", "completed"):
            inv.status = "active"
    elif inv.status in ("validated", "in_preparation", "active"):
        inv.status = "completed"
    inv.updated_at = datetime.utcnow()
    db.commit()
    message = (
        "Lien public activé — l'invitation est à nouveau accessible en ligne."
        if active
        else "Lien public arrêté — plus d'accès en ligne ni de nouveaux RSVP."
    )
    return {"status": "success", "message": message, "data": invitation_to_dict(inv, db)}


@router.post("/admin/invitations/{invitation_id}/guest-list/import")
async def import_guest_list_csv(
    invitation_id: str,
    file: UploadFile = File(...),
    merge: bool = Query(True),
    enable_restrict: bool = Query(True),
    _admin: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    inv = _get_invitation_or_404(db, invitation_id)
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Fichier CSV vide.")
    if len(raw) > 512 * 1024:
        raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 512 Ko).")

    imported = parse_invited_guest_names_from_csv(raw)
    if not imported:
        raise HTTPException(
            status_code=400,
            detail="Aucun nom d'invité trouvé. Utilisez une colonne « Nom » ou une colonne par nom.",
        )

    customization = dict(inv.customization) if isinstance(inv.customization, dict) else {}
    practical = dict(customization.get("practicalInfo") or {})
    existing = get_invited_guest_names(inv)
    merged = merge_invited_guest_names(existing, imported) if merge else merge_invited_guest_names([], imported)
    added_count = max(0, len(merged) - len(existing)) if merge else len(merged)

    practical["invitedGuestNames"] = merged
    if enable_restrict:
        practical["restrictRsvpToGuestList"] = True
    customization["practicalInfo"] = practical
    inv.customization = customization
    inv.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(inv)

    return {
        "status": "success",
        "message": f"{len(imported)} nom(s) importé(s) — {len(merged)} invité(s) au total.",
        "addedCount": added_count,
        "totalCount": len(merged),
        "data": invitation_to_dict(inv, db),
    }


@router.get("/admin/invitations/{invitation_id}/guests/export")
def export_guests_csv(
    invitation_id: str,
    _admin: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    inv = _get_invitation_or_404(db, invitation_id)
    guests = db.query(InvitationGuest).filter(InvitationGuest.invitation_id == inv.id).all()
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    for row in guests_to_csv_rows(guests):
        writer.writerow(row)
    buffer.seek(0)
    filename = f"invites-{inv.public_token or inv.id[:8]}.csv"
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/admin/invitations/{invitation_id}/pdf")
def download_invitation_pdf(
    invitation_id: str,
    mode: str = Query("system", pattern="^(system|template)$"),
    _admin: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    inv = _get_invitation_or_404(db, invitation_id)
    token = _require_public_token(inv)
    public_url = public_invitation_url(token)

    if mode == "template":
        customization = inv.customization if isinstance(inv.customization, dict) else {}
        template_url = customization.get("pdfTemplateUrl")
        if not isinstance(template_url, str) or not template_url.strip():
            raise HTTPException(status_code=400, detail="Aucun modèle PDF enregistré. Téléversez un modèle d'abord.")
        pdf_bytes = overlay_qr_on_pdf(_load_pdf_template_bytes(template_url.strip()), public_url)
        filename = pdf_filename(inv, "invitation-qr")
    else:
        pdf_bytes = build_system_invitation_pdf(inv, public_url)
        filename = pdf_filename(inv, "invitation")

    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/admin/invitations/{invitation_id}/pdf-template")
async def upload_invitation_pdf_template(
    invitation_id: str,
    file: UploadFile = File(...),
    save: bool = Query(True),
    position: str = Query("bottom-right"),
    page: int = Query(0, ge=0),
    _admin: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    inv = _get_invitation_or_404(db, invitation_id)
    token = _require_public_token(inv)
    public_url = public_invitation_url(token)

    filename = (file.filename or "").lower()
    content_type = (file.content_type or "").lower()
    if not (filename.endswith(".pdf") or content_type == "application/pdf"):
        raise HTTPException(status_code=400, detail="Le fichier doit être un PDF.")
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Fichier vide.")
    if len(raw) > MAX_INVITATION_PDF_BYTES:
        raise HTTPException(status_code=400, detail="PDF trop volumineux (max 15 Mo).")

    allowed_positions = {"bottom-right", "bottom-left", "top-right", "top-left", "center"}
    qr_position = position if position in allowed_positions else "bottom-right"

    if save:
        template_url = _save_pdf_template_bytes(raw, inv.id)
        customization = dict(inv.customization) if isinstance(inv.customization, dict) else {}
        customization["pdfTemplateUrl"] = template_url
        inv.customization = customization
        inv.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(inv)

    pdf_bytes = overlay_qr_on_pdf(raw, public_url, page_index=page, position=qr_position)  # type: ignore[arg-type]
    out_name = pdf_filename(inv, "invitation-modele")
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{out_name}"'},
    )


@router.post("/admin/invitations/{invitation_id}/guests")
def add_guest_manual(
    invitation_id: str,
    payload: GuestAdminUpsert,
    _admin: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    inv = _get_invitation_or_404(db, invitation_id)
    if payload.response not in GUEST_RESPONSES:
        raise HTTPException(status_code=400, detail="Réponse invalide.")
    guest = InvitationGuest(
        invitation_id=inv.id,
        full_name=payload.fullName.strip(),
        phone=(payload.phone or "").strip() or None,
        response=payload.response,
        guest_count=max(1, min(3, payload.guestCount)),
        companions=[c.strip() for c in (payload.companions or []) if c.strip()],
        message=(payload.message or "").strip() or None,
        source="admin_manual",
        responded_at=datetime.utcnow(),
    )
    db.add(guest)
    _commit_guest_with_pass(guest, db)
    return {"status": "success", "data": guest_to_dict(guest)}


@router.patch("/admin/invitations/{invitation_id}/guests/{guest_id}")
def update_guest(
    invitation_id: str,
    guest_id: str,
    payload: GuestAdminUpsert,
    _admin: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    _get_invitation_or_404(db, invitation_id)
    guest = db.query(InvitationGuest).filter(
        InvitationGuest.id == guest_id,
        InvitationGuest.invitation_id == invitation_id,
    ).first()
    if not guest:
        raise HTTPException(status_code=404, detail="Invité introuvable.")
    guest.full_name = payload.fullName.strip()
    guest.phone = (payload.phone or "").strip() or None
    guest.response = payload.response
    guest.guest_count = max(1, min(3, payload.guestCount))
    guest.companions = [c.strip() for c in (payload.companions or []) if c.strip()]
    guest.message = (payload.message or "").strip() or None
    guest.updated_at = datetime.utcnow()
    _commit_guest_with_pass(guest, db)
    return {"status": "success", "data": guest_to_dict(guest)}


@router.delete("/admin/invitations/{invitation_id}/guests/{guest_id}")
def delete_guest(
    invitation_id: str,
    guest_id: str,
    _admin: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    _get_invitation_or_404(db, invitation_id)
    guest = db.query(InvitationGuest).filter(
        InvitationGuest.id == guest_id,
        InvitationGuest.invitation_id == invitation_id,
    ).first()
    if not guest:
        raise HTTPException(status_code=404, detail="Invité introuvable.")
    db.delete(guest)
    db.commit()
    return {"status": "success", "message": "Invité supprimé."}


@router.get("/admin/invitations/{invitation_id}/guests/{guest_id}/pass.pdf")
def download_guest_pass_pdf(
    invitation_id: str,
    guest_id: str,
    _admin: User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    _get_invitation_or_404(db, invitation_id)
    guest = db.query(InvitationGuest).filter(
        InvitationGuest.id == guest_id,
        InvitationGuest.invitation_id == invitation_id,
    ).first()
    if not guest:
        raise HTTPException(status_code=404, detail="Invité introuvable.")
    if guest.response != "yes":
        raise HTTPException(status_code=400, detail="QR code disponible uniquement pour les invités confirmés.")
    inv = _get_invitation_or_404(db, invitation_id)
    _commit_guest_with_pass(guest, db)
    pass_url = guest_pass_url(guest.check_in_token or "")
    pdf_bytes = build_guest_pass_pdf(guest, inv, pass_url)
    filename = guest_pass_pdf_filename(guest.full_name, guest.check_in_token or guest.id[:8])
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# --- Public ---


@router.get("/invitations/public/{token}")
def get_public_invitation(token: str, db: Session = Depends(get_db)):
    inv = _get_invitation_by_token(db, token)
    return {"data": public_invitation_payload(inv)}


@router.post("/invitations/public/{token}/rsvp")
def submit_public_rsvp(
    token: str,
    payload: GuestRsvpRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(f"rsvp:{client_ip}:{token}", max_attempts=8, window_seconds=600)

    inv = _get_invitation_by_token(db, token)
    if payload.response not in GUEST_RESPONSES:
        raise HTTPException(status_code=400, detail="Réponse invalide.")
    rsvp_open, deadline = rsvp_form_status(inv)
    if not rsvp_open:
        detail = "Le formulaire de confirmation est fermé."
        if deadline:
            detail = f"Le formulaire de confirmation est fermé depuis le {deadline[:10]}."
        raise HTTPException(status_code=403, detail=detail)
    if inv.phone_required and not (payload.phone or "").strip():
        raise HTTPException(status_code=400, detail="Le téléphone est obligatoire.")

    companions = [c.strip() for c in (payload.companions or []) if c.strip()]
    list_error = verify_rsvp_guests_on_list(inv, payload.fullName.strip(), companions)
    if list_error:
        raise HTTPException(status_code=403, detail=list_error)

    preferences = payload.preferences if isinstance(payload.preferences, dict) else {}

    if payload.response == "yes":
        customization = inv.customization if isinstance(inv.customization, dict) else {}
        service_options = customization.get("serviceOptions") if isinstance(customization.get("serviceOptions"), dict) else {}
        persons_prefs = preferences.get("persons") if isinstance(preferences.get("persons"), list) else []
        count = max(1, min(3, payload.guestCount))
        if not persons_prefs:
            persons_prefs = [preferences] if preferences else [{} for _ in range(count)]
        while len(persons_prefs) < count:
            persons_prefs.append({})
        for person_index in range(count):
            person_pref = persons_prefs[person_index] if isinstance(persons_prefs[person_index], dict) else {}
            for group_key, pref_key in (("meals", "meal"), ("drinks", "drink"), ("others", "other")):
                group = service_options.get(group_key) if isinstance(service_options.get(group_key), dict) else {}
                if group.get("enabled") and group.get("required"):
                    if not str(person_pref.get(pref_key) or "").strip():
                        label = group.get("label") or group_key
                        who = f" (personne {person_index + 1})" if count > 1 else ""
                        raise HTTPException(
                            status_code=400,
                            detail=f"Le choix « {label} » est obligatoire{who}.",
                        )
        preferences = {"persons": persons_prefs[:count]}

    guest = InvitationGuest(
        invitation_id=inv.id,
        full_name=payload.fullName.strip(),
        phone=(payload.phone or "").strip() or None,
        response=payload.response,
        guest_count=max(1, min(3, payload.guestCount)),
        companions=companions,
        message=(payload.message or "").strip() or None,
        preferences=preferences,
        source="public_form",
        responded_at=datetime.utcnow(),
    )
    db.add(guest)
    _commit_guest_with_pass(guest, db)

    _append_manual_notification(
        db,
        "Nouvelle confirmation RSVP",
        f"{guest.full_name} — {inv.organizer_names} ({payload.response})",
    )
    background_tasks.add_task(
        bg_invitation_rsvp,
        inv.id,
        guest.full_name,
        payload.response,
        payload.guestCount,
    )
    return {
        "status": "success",
        "message": "Merci — votre réponse a bien été enregistrée.",
        "data": guest_to_dict(guest),
    }


@router.get("/invitations/pass/{token}")
def get_guest_pass(token: str, db: Session = Depends(get_db)):
    guest, inv = _get_guest_by_check_in_token(db, token)
    ensure_guest_check_in_token(guest, db)
    db.commit()
    db.refresh(guest)
    return {"data": guest_pass_payload(guest, inv)}


@router.post("/invitations/pass/{token}/check-in")
def check_in_guest_pass(token: str, db: Session = Depends(get_db)):
    guest, inv = _get_guest_by_check_in_token(db, token)
    already = guest.checked_in_at is not None
    if not already:
        guest.checked_in_at = datetime.utcnow()
        guest.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(guest)
    return {
        "status": "success",
        "alreadyCheckedIn": already,
        "data": guest_pass_payload(guest, inv),
    }
