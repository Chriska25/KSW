import os
import json
import uuid
import shutil
import io
import zipfile
import re
from datetime import datetime
# pyrefly: ignore [missing-import]
from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, Request, BackgroundTasks, Query
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from fastapi.staticfiles import StaticFiles
# pyrefly: ignore [missing-import]
from fastapi.responses import JSONResponse, FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any, List, Optional
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from storage_backend import get_media_storage
from app.core.config import settings
from database import engine, Base, get_db, SessionLocal, check_db_connection
from models import Setting, User, Service, Testimonial, Gallery, ElectronicInvitation, InvitationGuest
from schemas import SettingUpdate, LoginRequest, Verify2FARequest, Resend2FARequest, RegisterRequest, ForgotPasswordRequest, ResetPasswordRequest, ChangePasswordRequest, ProfileUpdateRequest, ServiceCreate, TestimonialCreate, GalleriesSaveAll, TestimonialsSaveAll, BlogPostsSaveAll, FaqSaveAll, VisitTrack, ClientPresenceHeartbeat, SyncFromLocalPayload, BackupRestorePayload, GalleryUnlockRequest, GalleryDownloadZipRequest, GalleryDownloadPhotoRequest, ContactCreate, BookingCreate, BookingStatusUpdate, BookingUpdate, StripeCheckoutCreate, MobileMoneyPaymentSubmit, MobileMoneyConfirm, BalancePaymentRecord, NotificationMarkRead, ClientNotificationMarkRead, AdminEmailTest, AdminUserUpsert
from superuser import is_superuser, ensure_superuser_column, ensure_superuser_account, SUPERUSER_EMAIL, SUPERUSER_ID
from pending_auth_store import ensure_pending_auth_table
from visit_analytics import track_visit, get_visit_analytics_summary
from client_presence import (
    record_client_login,
    touch_presence,
    list_online_sessions,
    list_clients_overview,
)
from client_activity import build_client_activity_timeline
from geoip import extract_client_ip, lookup_geo
from admin_logger import log_admin_request, get_admin_activity_logs, get_admin_log_file_path
from seed import seed_database, ensure_demo_gallery, ensure_blog_posts, ensure_faq_items
from security import (
    hash_password,
    cors_headers,
    security_headers,
    check_rate_limit,
    enforce_upload_size,
    resolve_booking_pricing,
    validate_redirect_url,
    validate_user_role_change,
    redact_settings_payload,
    is_blocked_upload,
    is_production,
    validate_security_at_startup,
    validate_password_policy,
)
from auth_cookies import AUTH_COOKIE_NAME, build_auth_json_response, clear_auth_cookie
from auth import (
    ACCESS_TOKEN_HOURS,
    create_access_token,
    create_pre_2fa_token,
    issue_2fa_code,
    issue_password_reset_token,
    consume_password_reset_token,
    verify_2fa_code,
    verify_password,
    get_current_user,
    require_admin_user,
    serialize_user,
    is_development,
    decode_token,
    require_super_admin,
    require_superuser,
    get_token_from_credentials,
    resolve_token,
)
from image_processor import (
    load_media_settings,
    process_image_bytes,
    save_raw_image_bytes,
    process_base64_data_url,
    maybe_process_image_url,
    is_image_upload,
    ensure_thumbnail_file,
    resolve_photo_thumb_url,
    apply_watermark_to_bytes,
    delivery_source_url,
    should_apply_watermark_at_delivery,
    infer_original_url_from_hd,
)
from email_service import notify_contact_received, notify_booking_created, notify_payment_received, notify_session_confirmed, send_gallery_access_email, send_gallery_access_for_gallery, send_gallery_photos_ready_email, send_test_email, send_password_reset_email, send_2fa_code_email, admin_email, resolve_2fa_delivery_email, is_mailtrap_live_host, is_mailtrap_sandbox_host, is_gmail_host, is_gmail_api_configured, gmail_api_missing_keys, check_email_connectivity
from booking_availability import (
    DEFAULT_TIME_SLOTS,
    evaluate_slot_availability,
    get_booked_times_for_date,
    is_wedding_service,
    normalize_time,
    suggest_alternative_slot,
    build_slot_conflict_message,
)
from gallery_booking_helpers import create_gallery_for_booking, get_gallery_for_booking
from public_settings import filter_public_settings
from password_reset_store import ensure_password_reset_table
from gallery_password import (
    is_stored_password_hash,
    migrate_gallery_passwords,
    prepare_gallery_password_for_storage,
    regenerate_gallery_password,
    verify_gallery_password,
)
from gallery_photo_notify import append_gallery_photo_notification, detect_gallery_photo_uploads
from gallery_thumbnails import generate_all_gallery_thumbnails
from invoice_helpers import ALLOWED_BALANCE_PAYMENT_METHODS, booking_to_invoice, compute_booking_financials
from studio_defaults import DEFAULT_STUDIO_CURRENCY, STUDIO_SETTING_DEFAULTS, merge_social_links, parse_currency_code, resolve_studio_currency
from notifications_helpers import build_client_notifications, mark_client_notifications_read
from settings_store import get_json_setting_list, get_json_settings_batch, get_setting_bool, get_setting_int, get_setting_value

# Ensure uploads directory exists
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
BLOG_POSTS_KEY = "blog_posts"
FAQ_ITEMS_KEY = "faq_items"
CONTACT_MESSAGES_KEY = "contact_messages"
BOOKINGS_KEY = "bookings"
NOTIFICATIONS_READ_KEY = "notifications_read_ids"
NOTIFICATIONS_MANUAL_KEY = "admin_notifications_manual"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ADMIN_ROLES = {"admin", "photographer", "assistant"}

PUBLIC_CACHE_GET_PREFIXES = (
    "/api/v1/services",
    "/api/v1/galleries/public",
    "/api/v1/galleries",
    "/api/v1/blog",
    "/api/v1/faq",
    "/api/v1/testimonials",
)


def _cache_control_header(method: str, path: str) -> str:
    if method != "GET":
        return "no-cache, no-store, must-revalidate, max-age=0"
    if path.startswith("/api/v1/admin") or path.startswith("/api/v1/auth") or path.startswith("/api/v1/client"):
        return "no-cache, no-store, must-revalidate, max-age=0"
    if any(path == prefix or path.startswith(f"{prefix}/") for prefix in PUBLIC_CACHE_GET_PREFIXES):
        return "public, max-age=60, stale-while-revalidate=300"
    return "no-cache, no-store, must-revalidate, max-age=0"


def _extract_admin_actor(request: Request) -> tuple[str, str, str]:
    auth = request.headers.get("authorization") or request.headers.get("Authorization") or ""
    if not auth.lower().startswith("bearer "):
        return "", "", ""
    token = auth[7:].strip()
    if not token or token.startswith("demo-token-"):
        return "", "", ""
    try:
        payload = decode_token(token)
        role = payload.get("role") or ""
        if role not in ADMIN_ROLES:
            return "", "", ""
        email = str(payload.get("email") or "")
        user_id = str(payload.get("sub") or "")
        name = email.split("@")[0] if email else user_id
        return email, user_id, name
    except Exception:
        return "", "", ""

def _use_supabase_pooler() -> bool:
    url = settings.database_url
    return "pooler.supabase.com" in url and ":6543" in url


# Auto-create tables on startup (sauf Supabase pooler transaction : schéma déjà migré)
def _should_bootstrap_schema() -> bool:
    return not _use_supabase_pooler()

if _should_bootstrap_schema():
    Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="KSW Studio Python FastAPI Backend",
    description="High-performance Python backend for KSW Studio photography platform",
    version="1.0.0",
    docs_url="/docs" if is_development() else None,
    redoc_url="/redoc" if is_development() else None,
)

from invitation_routes import router as invitation_router

app.include_router(invitation_router)

# Serve uploaded static files
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.on_event("startup")
def validate_security_on_startup():
    validate_security_at_startup()
    if _use_supabase_pooler():
        # Schéma déjà migré via pg_dump — évite des dizaines de connexions au pooler.
        return
    _ensure_gallery_booking_id_column()
    _ensure_gallery_deleted_at_column()
    ensure_superuser_column(engine)
    _ensure_user_profile_columns()
    _ensure_user_presence_columns()
    _ensure_invitation_guest_preferences_column()
    _ensure_invitation_link_schedule_columns()
    _ensure_service_kind_column()
    _ensure_invitation_guest_check_in_columns()
    ensure_pending_auth_table()


def _ensure_invitation_guest_check_in_columns() -> None:
    from sqlalchemy import inspect, text

    try:
        insp = inspect(engine)
        if "invitation_guests" not in insp.get_table_names():
            return
        cols = {c["name"] for c in insp.get_columns("invitation_guests")}
        with engine.begin() as conn:
            if "check_in_token" not in cols:
                conn.execute(text("ALTER TABLE invitation_guests ADD COLUMN check_in_token VARCHAR"))
            if "checked_in_at" not in cols:
                conn.execute(text("ALTER TABLE invitation_guests ADD COLUMN checked_in_at TIMESTAMP"))
    except Exception as exc:
        print(f"[MIGRATION] check_in sur invitation_guests: {exc}")


def _ensure_invitation_guest_preferences_column() -> None:
    from sqlalchemy import inspect, text

    try:
        insp = inspect(engine)
        if "invitation_guests" not in insp.get_table_names():
            return
        cols = {c["name"] for c in insp.get_columns("invitation_guests")}
        if "preferences" in cols:
            return
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE invitation_guests ADD COLUMN preferences JSON"))
    except Exception as exc:
        print(f"[MIGRATION] preferences sur invitation_guests: {exc}")


def _ensure_service_kind_column() -> None:
    from sqlalchemy import inspect, text

    try:
        insp = inspect(engine)
        if "services" not in insp.get_table_names():
            return
        cols = {c["name"] for c in insp.get_columns("services")}
        if "service_kind" in cols:
            return
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE services ADD COLUMN service_kind VARCHAR DEFAULT 'photo'"))
    except Exception as exc:
        print(f"[MIGRATION] service_kind sur services: {exc}")


def _service_kind_from_item(item: Dict[str, Any]) -> str:
    raw = item.get("serviceKind") or item.get("service_kind")
    if raw == "invitation":
        return "invitation"
    title = str(item.get("title", "")).lower()
    category = str(item.get("category", "")).lower()
    if "invitation" in f"{title} {category}":
        return "invitation"
    return "photo"


def _service_to_dict(srv: Service) -> Dict[str, Any]:
    kind = getattr(srv, "service_kind", None) or "photo"
    return {
        "id": srv.id,
        "title": srv.title,
        "category": srv.category,
        "price": srv.price,
        "depositPercentage": srv.deposit_percentage or 30,
        "durationMinutes": srv.duration_minutes or 120,
        "photosCount": srv.photos_count or 20,
        "coverImage": srv.cover_image,
        "isActive": srv.is_active,
        "serviceKind": kind if kind in {"photo", "invitation"} else "photo",
        "seoTitle": srv.seo_title,
        "seoDescription": srv.seo_description,
    }


def _ensure_invitation_link_schedule_columns() -> None:
    from sqlalchemy import inspect, text

    try:
        insp = inspect(engine)
        if "electronic_invitations" not in insp.get_table_names():
            return
        cols = {c["name"] for c in insp.get_columns("electronic_invitations")}
        with engine.begin() as conn:
            if "link_active_from" not in cols:
                conn.execute(text("ALTER TABLE electronic_invitations ADD COLUMN link_active_from VARCHAR"))
            if "link_active_until" not in cols:
                conn.execute(text("ALTER TABLE electronic_invitations ADD COLUMN link_active_until VARCHAR"))
    except Exception as exc:
        print(f"[MIGRATION] link_active_from/until sur electronic_invitations: {exc}")


def _ensure_gallery_booking_id_column() -> None:
    from sqlalchemy import inspect, text

    try:
        insp = inspect(engine)
        if "galleries" not in insp.get_table_names():
            return
        cols = {c["name"] for c in insp.get_columns("galleries")}
        if "booking_id" in cols:
            return
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE galleries ADD COLUMN booking_id VARCHAR"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_galleries_booking_id ON galleries (booking_id)"))
    except Exception as exc:
        print(f"[MIGRATION] booking_id sur galleries: {exc}")


def _ensure_gallery_deleted_at_column() -> None:
    from sqlalchemy import inspect, text

    try:
        insp = inspect(engine)
        if "galleries" not in insp.get_table_names():
            return
        cols = {c["name"] for c in insp.get_columns("galleries")}
        if "deleted_at" in cols:
            return
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE galleries ADD COLUMN deleted_at VARCHAR"))
    except Exception as exc:
        print(f"[MIGRATION] deleted_at sur galleries: {exc}")


def _ensure_user_profile_columns() -> None:
    from sqlalchemy import inspect, text

    try:
        insp = inspect(engine)
        if "users" not in insp.get_table_names():
            return
        cols = {c["name"] for c in insp.get_columns("users")}
        with engine.begin() as conn:
            if "phone" not in cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR"))
            if "avatar_url" not in cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN avatar_url TEXT"))
    except Exception as exc:
        print(f"[MIGRATION] colonnes profil users: {exc}")


def _ensure_user_presence_columns() -> None:
    from sqlalchemy import inspect, text

    try:
        insp = inspect(engine)
        if "users" not in insp.get_table_names():
            return
        cols = {c["name"] for c in insp.get_columns("users")}
        with engine.begin() as conn:
            if "last_login_at" not in cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP"))
            if "last_seen_at" not in cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN last_seen_at TIMESTAMP"))
            if "last_login_ip" not in cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN last_login_ip VARCHAR"))
            if "last_login_city" not in cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN last_login_city VARCHAR"))
            if "last_login_country" not in cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN last_login_country VARCHAR"))
    except Exception as exc:
        print(f"[MIGRATION] colonnes présence users: {exc}")


@app.middleware("http")
async def dynamic_cors_and_cache_middleware(request, call_next):
    origin = request.headers.get("origin")

    if request.method == "OPTIONS":
        return JSONResponse(status_code=200, content={"status": "ok"}, headers=cors_headers(origin))

    try:
        response = await call_next(request)
    except Exception as exc:
        print(f"MIDDLEWARE ERROR: {exc}")
        return JSONResponse(
            status_code=500,
            content={"detail": "Erreur interne du serveur."},
            headers=cors_headers(origin),
        )

    for key, value in cors_headers(origin).items():
        response.headers[key] = value
    for key, value in security_headers().items():
        response.headers[key] = value
    cache_control = _cache_control_header(request.method.upper(), request.url.path)
    response.headers["Cache-Control"] = cache_control
    if cache_control.startswith("no-cache"):
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"

    if request.url.path.startswith("/api/v1/admin") and request.method != "OPTIONS":
        try:
            actor_email, actor_id, actor_name = _extract_admin_actor(request)
            log_admin_request(
                None,
                request=request,
                status_code=response.status_code,
                actor_email=actor_email,
                actor_id=actor_id,
                actor_name=actor_name,
            )
        except Exception as log_exc:
            print(f"ADMIN LOG ERROR: {log_exc}")

    return response

@app.post("/api/v1/upload")
async def upload_file(
    file: UploadFile = File(...),
    skip_watermark: bool = Query(False),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin_user),
):
    content = await file.read()
    enforce_upload_size(len(content))
    media_settings = load_media_settings(db)

    if is_image_upload(file.content_type, file.filename or ""):
        if skip_watermark:
            url, size = save_raw_image_bytes(content, UPLOAD_DIR)
            ext = os.path.splitext(url)[1].lower()
            return {
                "url": url,
                "filename": os.path.basename(url),
                "size": size,
                "processed": False,
                "format": ext.lstrip(".") or "image",
            }

        url, size, thumb_url, original_url = process_image_bytes(content, media_settings, UPLOAD_DIR)
        hd_url = url
        return {
            "url": url,
            "hdUrl": hd_url,
            "originalUrl": original_url,
            "thumbUrl": thumb_url,
            "watermarked": True,
            "filename": os.path.basename(url),
            "size": size,
            "processed": True,
            "format": "webp",
        }

    if is_blocked_upload(file.filename or ""):
        raise HTTPException(status_code=400, detail="Type de fichier non autorisé.")

    ext = os.path.splitext(file.filename or "")[1].lower()
    if not ext:
        content_type = (file.content_type or "").lower()
        if "video/mp4" in content_type:
            ext = ".mp4"
        elif "video/webm" in content_type:
            ext = ".webm"
        elif "video/quicktime" in content_type:
            ext = ".mov"
    filename = f"{uuid.uuid4()}{ext or '.bin'}"
    storage = get_media_storage(UPLOAD_DIR)
    url = storage.put_bytes(filename, content)

    return {
        "url": url,
        "filename": filename,
        "size": len(content),
        "processed": False,
    }


@app.post("/api/v1/upload/base64")
async def upload_base64(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin_user),
):
    data_url = payload.get("image") or payload.get("dataUrl") or ""
    if not data_url:
        raise HTTPException(status_code=400, detail="Image base64 manquante")

    media_settings = load_media_settings(db)
    url = process_base64_data_url(str(data_url), media_settings, UPLOAD_DIR)
    if url.startswith("data:"):
        raise HTTPException(status_code=400, detail="Impossible de traiter l'image")

    file_path = os.path.join(UPLOAD_DIR, os.path.basename(url))
    return {
        "url": url,
        "filename": os.path.basename(url),
        "size": os.path.getsize(file_path) if os.path.exists(file_path) else 0,
        "processed": True,
        "format": "webp",
    }

@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        seed_database(db)
        ensure_demo_gallery(db)
        ensure_blog_posts(db)
        ensure_faq_items(db)
        ensure_superuser_account(db)
        migrate_gallery_passwords(db)
        ensure_password_reset_table()
    except Exception as exc:
        print(f"[STARTUP] Initialisation base ignorée: {exc}")
    finally:
        db.close()

# -------------------------------------------------------------------
# Health Check Endpoint
# -------------------------------------------------------------------
@app.get("/api/v1/health")
def health_check():
    db_ok = check_db_connection()
    return {
        "status": "ok" if db_ok else "degraded",
        "service": "KSW Studio Python FastAPI Backend",
        "version": "1.0.0",
        "database": "connected" if db_ok else "unavailable",
    }


@app.post("/api/v1/analytics/visit")
def track_site_visit(payload: VisitTrack, request: Request, background_tasks: BackgroundTasks):
    check_rate_limit(f"visit:{extract_client_ip(request)}", max_attempts=120, window_seconds=60)
    ip = extract_client_ip(request)
    geo = lookup_geo(ip)
    background_tasks.add_task(
        _track_visit_background,
        payload.path,
        payload.session_id,
        payload.referrer or "",
        ip,
        str(geo.get("city") or ""),
        str(geo.get("country") or ""),
        str(geo.get("countryCode") or ""),
        str(geo.get("region") or ""),
    )
    return {"status": "ok"}


def _track_visit_background(
    path: str,
    session_id: str,
    referrer: str,
    ip: str,
    city: str,
    country: str,
    country_code: str,
    region: str,
) -> None:
    db = SessionLocal()
    try:
        track_visit(
            db,
            path=path,
            session_id=session_id,
            referrer=referrer,
            ip=ip,
            city=city,
            country=country,
            country_code=country_code,
            region=region,
        )
    except Exception:
        db.rollback()
    finally:
        db.close()


@app.get("/api/v1/admin/analytics/visits")
def admin_visit_analytics(db: Session = Depends(get_db), _admin: User = Depends(require_admin_user)):
    return {"data": get_visit_analytics_summary(db)}


@app.post("/api/v1/admin/purge-reset")
def purge_system_reset(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_super_admin),
):
    if is_production() and os.getenv("ALLOW_PURGE_RESET", "").lower() != "true":
        raise HTTPException(status_code=403, detail="Opération désactivée en production.")
    # Delete all stale data to enforce single database source of truth
    db.query(Setting).delete()
    db.query(User).delete()
    db.query(Service).delete()
    db.query(Testimonial).delete()
    db.query(Gallery).delete()
    db.commit()

    # Re-seed single canonical dataset
    seed_database(db)
    ensure_faq_items(db)
    ensure_superuser_account(db)

    return {
        "status": "success",
        "message": "Purge système effectuée avec succès. La base de données PostgreSQL est désormais l'unique source de vérité."
    }

# Helper type conversions
def safe_float(val, default=0.0):
    try:
        if val is None or val == "":
            return default
        return float(val)
    except Exception:
        return default

def safe_int(val, default=0):
    try:
        if val is None or val == "":
            return default
        return int(val)
    except Exception:
        return default

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    import logging

    logging.getLogger("ksw.security").exception("Unhandled API error")
    origin = request.headers.get("origin")
    headers = cors_headers(origin)
    headers.update(security_headers())
    return JSONResponse(
        status_code=500,
        content={"detail": "Erreur interne du serveur."},
        headers=headers,
    )

@app.post("/api/v1/admin/sync-from-local")
def sync_from_local(payload: SyncFromLocalPayload, db: Session = Depends(get_db), _admin: User = Depends(require_super_admin)):
    try:
        media_settings = load_media_settings(db)

        # 1. Purge & Sync Settings
        if payload.settings:
            db.query(Setting).delete()
            for k, v in payload.settings.items():
                if v is None:
                    continue
                val_str = json.dumps(v) if isinstance(v, (dict, list, bool)) else str(v)
                db.add(Setting(key=k, value=val_str))
            db.flush()
            media_settings = load_media_settings(db)
        
        # 2. Purge & Sync Services
        if payload.services is not None:
            db.query(Service).delete()
            for item in payload.services:
                if not isinstance(item, dict):
                    continue
                srv_id = str(item.get("id", f"srv-{uuid.uuid4()}"))

                dep_pct = item.get("depositPercentage") if item.get("depositPercentage") is not None else item.get("deposit_percentage")
                dur_min = item.get("durationMinutes") if item.get("durationMinutes") is not None else item.get("duration_minutes")
                pts_cnt = item.get("photosCount") if item.get("photosCount") is not None else item.get("photos_count")
                cov_img = item.get("coverImage") or item.get("cover_image")
                cov_img = maybe_process_image_url(cov_img, media_settings, UPLOAD_DIR)
                is_act = item.get("isActive") if item.get("isActive") is not None else item.get("is_active")
                if is_act is None:
                    is_act = True

                db.add(Service(
                    id=srv_id,
                    title=str(item.get("title", "Prestation")),
                    category=str(item.get("category", "Mariage")),
                    price=safe_float(item.get("price"), 500.0),
                    deposit_percentage=safe_int(dep_pct, 30),
                    duration_minutes=safe_int(dur_min, 120),
                    photos_count=safe_int(pts_cnt, 20),
                    cover_image=cov_img,
                    is_active=bool(is_act),
                    service_kind=_service_kind_from_item(item),
                ))

        # 3. Purge & Sync Galleries
        if payload.galleries is not None:
            db.query(Gallery).delete()
            for item in payload.galleries:
                if not isinstance(item, dict):
                    continue
                g_id = str(item.get("id", f"gal-{uuid.uuid4()}"))

                cover_url = maybe_process_image_url(item.get("coverUrl"), media_settings, UPLOAD_DIR)
                photos = item.get("photos", []) or []
                processed_photos = []
                for photo in photos:
                    if isinstance(photo, dict):
                        p = dict(photo)
                        p["url"] = maybe_process_image_url(p.get("url"), media_settings, UPLOAD_DIR)
                        resolved = resolve_photo_thumb_url(p.get("url"), p.get("thumbUrl"), UPLOAD_DIR)
                        if resolved:
                            p["thumbUrl"] = resolved
                        if p.get("url") and not p.get("hdUrl"):
                            p["hdUrl"] = p["url"]
                        if p.get("url") and str(p.get("url")).startswith("/uploads/") and p.get("watermarked") is None:
                            p["watermarked"] = True
                        processed_photos.append(p)
                    else:
                        processed_photos.append(photo)

                db.add(Gallery(
                    id=g_id,
                    title=str(item.get("title", "Galerie")),
                    client_name=str(item.get("clientName", "Client")),
                    client_email=item.get("clientEmail"),
                    category=str(item.get("category", "mariage")),
                    is_private=bool(item.get("isPrivate", False)),
                    access_key=str(item.get("accessKey", "KEY")),
                    password=prepare_gallery_password_for_storage(item.get("password")),
                    expires_at=item.get("expiresAt"),
                    cover_url=cover_url,
                    albums=item.get("albums", []),
                    photos=processed_photos,
                ))

        # 4. Sync Blog Posts (JSON in settings table)
        if payload.blog_posts is not None:
            existing_blog = db.query(Setting).filter(Setting.key == BLOG_POSTS_KEY).first()
            blog_val = json.dumps(payload.blog_posts)
            if existing_blog:
                existing_blog.value = blog_val
            else:
                db.add(Setting(key=BLOG_POSTS_KEY, value=blog_val))

        # 5. Sync Testimonials
        if payload.testimonials is not None:
            db.query(Testimonial).delete()
            for item in payload.testimonials:
                if not isinstance(item, dict):
                    continue
                db.add(Testimonial(
                    id=str(item.get("id", uuid.uuid4())),
                    client_name=str(item.get("clientName", "Client")),
                    client_role=str(item.get("clientRole", "Client Studio")),
                    rating=safe_int(item.get("rating"), 5),
                    content=str(item.get("content", "")),
                    avatar_url=item.get("avatarUrl"),
                    is_published=bool(item.get("isPublished", False)),
                ))

        db.commit()
        return {"status": "success", "message": "Base de données réinitialisée et remplacée avec succès."}
    except Exception as e:
        db.rollback()
        print(f"Erreur sync_from_local: {e}")
        raise HTTPException(status_code=500, detail="Échec de la synchronisation.")

# -------------------------------------------------------------------
# Settings Endpoints (Persisted in PostgreSQL)
# -------------------------------------------------------------------
def _request_is_admin(request: Request, db: Session) -> bool:
    auth = request.headers.get("authorization") or request.headers.get("Authorization") or ""
    token = ""
    if auth.lower().startswith("bearer "):
        token = auth[7:].strip()
    if not token:
        token = request.cookies.get(AUTH_COOKIE_NAME) or ""
    if not token:
        return False
    try:
        payload = decode_token(token)
        if payload.get("pre_2fa"):
            return False
        user = db.query(User).filter(User.id == str(payload.get("sub"))).first()
        if not user:
            return False
        role = user.role or "client"
        if role not in {"admin", "photographer", "assistant"}:
            return False
        if role in {"admin", "photographer", "assistant"} and not payload.get("2fa_verified"):
            return False
        return True
    except Exception:
        return False


@app.get("/api/v1/settings")
def get_settings(request: Request, db: Session = Depends(get_db)):
    settings_db = db.query(Setting).all()
    result = {}
    secret_keys = {"stripeSecretKey", "stripeWebhookSecret", "smtpPassword"}
    for s in settings_db:
        try:
            result[s.key] = json.loads(s.value)
        except Exception:
            result[s.key] = s.value
    smtp_password_stored = str(result.get("smtpPassword") or os.getenv("SMTP_PASSWORD") or "").strip()
    result["smtpPasswordConfigured"] = bool(smtp_password_stored)
    for key in secret_keys:
        if key in result:
            result[key] = ""
    for key, default in STUDIO_SETTING_DEFAULTS.items():
        if key not in result or result[key] in (None, ""):
            result[key] = default
    result["socialLinks"] = merge_social_links(result.get("socialLinks"))
    if not _request_is_admin(request, db):
        result = filter_public_settings(result)
    return {"data": result}

@app.post("/api/v1/settings")
@app.post("/api/v1/admin/settings")
def update_settings(payload: SettingUpdate, db: Session = Depends(get_db), _admin: User = Depends(require_admin_user)):
    from security import should_preserve_secret_on_update

    try:
        for k, v in payload.settings.items():
            if v is None:
                continue
            if should_preserve_secret_on_update(k, v):
                continue
            existing = db.query(Setting).filter(Setting.key == k).first()
            val_str = json.dumps(v)
            if existing:
                existing.value = val_str
            else:
                db.add(Setting(key=k, value=val_str))
        db.commit()
        return {
            "status": "success",
            "message": "Paramètres enregistrés et persistés avec succès en BDD PostgreSQL (Python FastAPI)",
            "data": redact_settings_payload(payload.settings),
        }
    except Exception as e:
        db.rollback()
        print(f"Erreur update_settings: {e}")
        raise HTTPException(status_code=500, detail="Impossible d'enregistrer les paramètres.")

# -------------------------------------------------------------------
# Auth Endpoints
# -------------------------------------------------------------------
def _normalize_login_email(email: str) -> str:
    email_clean = email.lower().strip()
    if is_development() and email_clean == "client@kswstudio.fr":
        return "sophie.d@email.com"
    return email_clean


def _staff_requires_2fa(user: User, db: Session) -> bool:
    if is_superuser(user):
        return False
    role = user.role or "client"
    if role not in ADMIN_ROLES:
        return False
    return get_setting_bool(db, "force2FAForAdmin", True)


def _staff_session_hours(db: Session, user: User) -> int:
    role = user.role or "client"
    if role not in ADMIN_ROLES:
        return ACCESS_TOKEN_HOURS
    return max(1, min(168, get_setting_int(db, "sessionLifetimeHours", 8)))


@app.get("/api/v1/auth/me")
def auth_me(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if (current_user.role or "client") == "client":
        ip = extract_client_ip(request)
        geo = lookup_geo(ip)
        touch_presence(
            db,
            current_user,
            session_id=f"me-{current_user.id}",
            path="/auth/me",
            ip=ip,
            city=str(geo.get("city") or ""),
            country=str(geo.get("country") or ""),
            country_code=str(geo.get("countryCode") or ""),
            region=str(geo.get("region") or ""),
            user_agent=request.headers.get("user-agent") or "",
        )
    return {"user": serialize_user(current_user)}


@app.get("/api/v1/profile")
def get_profile(current_user: User = Depends(get_current_user)):
    return {"status": "success", "data": serialize_user(current_user)}


@app.post("/api/v1/profile/avatar")
async def upload_profile_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    content = await file.read()
    if not is_image_upload(file.content_type, file.filename or ""):
        raise HTTPException(status_code=400, detail="Veuillez téléverser une image valide.")
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image trop volumineuse (max 5 Mo).")

    url, size = save_raw_image_bytes(content, UPLOAD_DIR)
    return {
        "status": "success",
        "url": url,
        "filename": os.path.basename(url),
        "size": size,
    }


@app.patch("/api/v1/profile")
def update_profile(
    payload: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    if payload.first_name is not None:
        user.first_name = payload.first_name.strip()
    if payload.last_name is not None:
        user.last_name = payload.last_name.strip()
    if payload.phone is not None:
        user.phone = payload.phone.strip() or None
    if payload.avatar_url is not None:
        user.avatar_url = payload.avatar_url.strip() or None

    db.commit()
    db.refresh(user)
    return {"status": "success", "message": "Profil mis à jour.", "data": serialize_user(user)}


def _change_user_password(user: User, current_password: str, new_password: str, db: Session) -> None:
    validate_password_policy(new_password)
    if not verify_password(user, current_password):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect.")
    user.password = hash_password(new_password)
    db.commit()


@app.post("/api/v1/profile/password")
def profile_change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
    _change_user_password(user, payload.current_password, payload.new_password, db)
    return {"status": "success", "message": "Mot de passe mis à jour."}


@app.post("/api/v1/auth/login")
def login(req: LoginRequest, request: Request, db: Session = Depends(get_db)):
    client_ip = extract_client_ip(request)
    check_rate_limit(f"login:{client_ip}:{req.email.lower().strip()}", max_attempts=8, window_seconds=900)
    email_clean = _normalize_login_email(req.email)
    user = db.query(User).filter(User.email == email_clean).first()

    if not user or not verify_password(user, req.password):
        raise HTTPException(status_code=400, detail="Identifiants incorrects.")

    if (user.status or "active") == "pending":
        raise HTTPException(status_code=403, detail="Votre compte client est en attente de validation par l'administrateur.")
    if (user.status or "active") == "suspended":
        raise HTTPException(status_code=403, detail="Ce compte a été temporairement suspendu par l'administration.")

    res_user = serialize_user(user)

    if _staff_requires_2fa(user, db):
        code = issue_2fa_code(user.id)
        delivery_email = resolve_2fa_delivery_email(db, user.email)
        email_sent, email_error = send_2fa_code_email(
            db,
            delivery_email,
            code,
            user.name or user.email,
        )
        if email_sent:
            print(f"[2FA EMAIL] Code envoyé à {delivery_email} (compte {user.email})")
        else:
            print(f"[2FA EMAIL] Échec envoi à {delivery_email} : {email_error}")
            if is_development():
                print(f"[DEV 2FA] Code pour {delivery_email}: {code} (123456 accepté en dev)")
        pre_token = create_pre_2fa_token(user)
        return {
            "token": pre_token,
            "user": res_user,
            "requires_2fa": True,
            "user_id": user.id,
            "two_fa_email": delivery_email,
            "email_sent": email_sent,
            "message": (
                f"Code de connexion envoyé à {delivery_email}."
                if email_sent
                else "Code généré — vérifiez la configuration SMTP ou utilisez le code affiché en console serveur."
            ),
        }

    if (user.role or "client") == "client":
        geo = lookup_geo(client_ip)
        record_client_login(
            db,
            user,
            session_id=f"login-{user.id}-{int(datetime.utcnow().timestamp())}",
            ip=client_ip,
            city=str(geo.get("city") or ""),
            country=str(geo.get("country") or ""),
            country_code=str(geo.get("countryCode") or ""),
            region=str(geo.get("region") or ""),
            user_agent=request.headers.get("user-agent") or "",
        )

    session_hours = _staff_session_hours(db, user)
    access_token = create_access_token(user, two_fa_verified=True, hours=session_hours)
    return build_auth_json_response(
        {
            "user": res_user,
            "requires_2fa": False,
            "user_id": user.id,
        },
        access_token,
        max_age_hours=session_hours,
    )


@app.post("/api/v1/auth/resend-2fa")
def resend_2fa(
    req: Resend2FARequest,
    request: Request,
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
):
    check_rate_limit(f"2fa-resend:{req.user_id}", max_attempts=3, window_seconds=900)
    pre_token = resolve_token(request, credentials)
    if not pre_token:
        raise HTTPException(status_code=401, detail="Session 2FA requise. Reconnectez-vous.")
    try:
        payload = decode_token(pre_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Session 2FA invalide ou expirée.")
    if not payload.get("pre_2fa") or str(payload.get("sub")) != str(req.user_id):
        raise HTTPException(status_code=401, detail="Session 2FA invalide.")

    user = db.query(User).filter(User.id == req.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    code = issue_2fa_code(user.id)
    delivery_email = resolve_2fa_delivery_email(db, user.email)
    email_sent, email_error = send_2fa_code_email(
        db,
        delivery_email,
        code,
        user.name or user.email,
    )
    if email_sent:
        print(f"[2FA EMAIL] Code renvoyé à {delivery_email}")
        return {"status": "success", "message": f"Nouveau code envoyé à {delivery_email}."}

    print(f"[2FA EMAIL] Échec renvoi à {delivery_email} : {email_error}")
    if is_development():
        print(f"[DEV 2FA] Code pour {delivery_email}: {code} (123456 accepté en dev)")
    raise HTTPException(
        status_code=503,
        detail=email_error or "Impossible d'envoyer le code par email. Vérifiez la configuration SMTP.",
    )


@app.post("/api/v1/auth/verify-2fa")
def verify_2fa(
    req: Verify2FARequest,
    request: Request,
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
):
    check_rate_limit(f"2fa:{req.user_id}", max_attempts=8, window_seconds=900)
    pre_token = resolve_token(request, credentials)
    if not pre_token:
        raise HTTPException(status_code=401, detail="Session 2FA requise. Reconnectez-vous.")
    try:
        payload = decode_token(pre_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Session 2FA invalide ou expirée.")
    if not payload.get("pre_2fa") or str(payload.get("sub")) != str(req.user_id):
        raise HTTPException(status_code=401, detail="Session 2FA invalide.")

    user = db.query(User).filter(User.id == req.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    if not verify_2fa_code(req.user_id, req.code):
        raise HTTPException(status_code=400, detail="Code 2FA invalide ou expiré.")

    res_user = serialize_user(user)
    session_hours = _staff_session_hours(db, user)
    access_token = create_access_token(user, two_fa_verified=True, hours=session_hours)
    return build_auth_json_response({"user": res_user}, access_token, max_age_hours=session_hours)

@app.post("/api/v1/auth/logout")
def logout():
    response = JSONResponse(content={"status": "success", "message": "Déconnexion effectuée."})
    clear_auth_cookie(response)
    return response

@app.post("/api/v1/auth/register")
def register(req: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    check_rate_limit(f"register:{extract_client_ip(request)}", max_attempts=6, window_seconds=3600)
    validate_password_policy(req.password)
    existing = db.query(User).filter(User.email == req.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Un compte existe déjà avec cet email.")
    
    new_user = User(
        first_name=req.first_name,
        last_name=req.last_name,
        email=req.email.lower(),
        password=hash_password(req.password),
        role="client",
        status="pending",
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "Compte créé. Votre accès sera activé après validation par l'administrateur.",
        "user": {
            "id": new_user.id,
            "name": new_user.name,
            "email": new_user.email,
            "role": new_user.role,
            "status": new_user.status,
            "roles": [{"name": new_user.role or "client"}],
        },
    }

@app.post("/api/v1/auth/forgot-password")
def forgot_password(
    req: ForgotPasswordRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    check_rate_limit(f"forgot:{extract_client_ip(request)}:{req.email.lower().strip()}", max_attempts=5, window_seconds=3600)
    email_clean = _normalize_login_email(req.email)
    user = db.query(User).filter(User.email == email_clean).first()
    if user:
        token = issue_password_reset_token(user.id)
        background_tasks.add_task(_send_password_reset_email_task, user.email, user.name or user.email, token)
    return {"message": "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé."}


@app.post("/api/v1/auth/reset-password")
def reset_password(req: ResetPasswordRequest, request: Request, db: Session = Depends(get_db)):
    check_rate_limit(f"reset-password:{extract_client_ip(request)}", max_attempts=8, window_seconds=900)
    password = (req.password or "").strip()
    validate_password_policy(password)

    user_id = consume_password_reset_token(req.token)
    if not user_id:
        raise HTTPException(status_code=400, detail="Lien invalide ou expiré. Demandez un nouveau lien.")

    user = db.query(User).filter(User.id == str(user_id)).first()
    if not user:
        raise HTTPException(status_code=400, detail="Utilisateur introuvable.")

    user.password = hash_password(password)
    db.commit()
    return {"message": "Mot de passe mis à jour. Vous pouvez vous connecter."}


def _send_password_reset_email_task(email: str, name: str, token: str) -> None:
    db = SessionLocal()
    try:
        send_password_reset_email(db, email, token, name)
    finally:
        db.close()


def _send_2fa_code_email_task(email: str, name: str, code: str) -> None:
    db = SessionLocal()
    try:
        ok, err = send_2fa_code_email(db, email, code, name)
        if ok:
            print(f"[2FA EMAIL] Code envoyé à {email}")
        else:
            print(f"[2FA EMAIL] Échec envoi à {email} : {err}")
            if is_development():
                print(f"[DEV 2FA] Code pour {email}: {code} (123456 accepté en dev)")
    finally:
        db.close()

@app.get("/api/v1/admin/users")
def list_users(db: Session = Depends(get_db), admin: User = Depends(require_admin_user)):
    users = db.query(User).all()
    res = []
    for u in users:
        if is_superuser(u) and not is_superuser(admin):
            continue
        res.append({
            "id": u.id,
            "name": u.name,
            "firstName": u.first_name or "",
            "lastName": u.last_name or "",
            "email": u.email,
            "role": u.role or "admin",
            "status": u.status or "active",
            "createdAt": u.created_at.strftime("%Y-%m-%d") if u.created_at else "2026-07-28",
            "lastLogin": u.last_login_at.isoformat() + "Z" if getattr(u, "last_login_at", None) else None,
            "lastSeenAt": u.last_seen_at.isoformat() + "Z" if getattr(u, "last_seen_at", None) else None,
            "location": {
                "city": getattr(u, "last_login_city", None) or "—",
                "country": getattr(u, "last_login_country", None) or "—",
            },
        })
    return {"data": res}

@app.post("/api/v1/admin/users")
def create_or_update_user(
    payload: AdminUserUpsert,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin_user),
):
    user_id = payload.id
    email = payload.email.lower().strip()
    first_name = payload.firstName or ""
    last_name = payload.lastName or ""
    password = payload.password

    existing = None
    if user_id:
        existing = db.query(User).filter(User.id == str(user_id)).first()
    if not existing and email:
        existing = db.query(User).filter(User.email == email).first()

    if existing:
        if is_superuser(existing) and not is_superuser(admin):
            raise HTTPException(status_code=403, detail="Ce compte système ne peut pas être modifié.")
        if payload.role is not None:
            role = payload.role.strip().lower()
            validate_user_role_change(admin.role or "client", role)
            existing.role = role
        if payload.status is not None:
            existing.status = payload.status.strip()
        existing.first_name = first_name or existing.first_name
        existing.last_name = last_name or existing.last_name
        if password:
            validate_password_policy(password)
            existing.password = hash_password(password)
        db.commit()
        db.refresh(existing)
        return {"status": "success", "message": "Utilisateur mis à jour", "user": {"id": existing.id, "email": existing.email, "role": existing.role}}

    role = (payload.role or "client").strip().lower()
    user_status = (payload.status or "pending").strip()
    validate_user_role_change(admin.role or "client", role)
    if not password:
        raise HTTPException(status_code=400, detail="Mot de passe requis pour créer un utilisateur.")
    validate_password_policy(password)
    if email == SUPERUSER_EMAIL or str(user_id) == SUPERUSER_ID:
        raise HTTPException(status_code=403, detail="Impossible de créer un compte super administrateur.")
    new_u = User(
        id=str(user_id or uuid.uuid4()),
        first_name=first_name,
        last_name=last_name,
        email=email,
        password=hash_password(password),
        role=role,
        status=user_status,
    )
    db.add(new_u)
    db.commit()
    db.refresh(new_u)
    return {"status": "success", "message": "Utilisateur créé", "user": {"id": new_u.id, "email": new_u.email, "role": new_u.role}}


@app.delete("/api/v1/admin/users/{user_id}")
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin_user),
):
    user = db.query(User).filter(User.id == str(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
    if is_superuser(user):
        raise HTTPException(status_code=403, detail="Impossible de supprimer le compte super administrateur système.")
    if (user.role or "") == "admin" and user.email == "admin@kswstudio.fr":
        raise HTTPException(status_code=400, detail="Impossible de supprimer le compte administrateur principal.")
    db.delete(user)
    db.commit()
    return {"status": "success", "message": "Utilisateur supprimé."}


@app.post("/api/v1/client/presence/heartbeat")
def client_presence_heartbeat(
    payload: ClientPresenceHeartbeat,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if (current_user.role or "client") != "client":
        return {"status": "ignored"}
    ip = extract_client_ip(request)
    geo = lookup_geo(ip)
    session_id = (payload.session_id or f"hb-{current_user.id}").strip()[:64]
    touch_presence(
        db,
        current_user,
        session_id=session_id,
        path=(payload.path or "/client/dashboard")[:200],
        ip=ip,
        city=str(geo.get("city") or ""),
        country=str(geo.get("country") or ""),
        country_code=str(geo.get("countryCode") or ""),
        region=str(geo.get("region") or ""),
        user_agent=request.headers.get("user-agent") or "",
    )
    return {"status": "ok"}


@app.get("/api/v1/admin/clients/overview")
def admin_clients_overview(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin_user),
):
    online = list_online_sessions(db)
    clients = list_clients_overview(db)
    return {
        "data": {
            "onlineCount": len(online),
            "totalClients": len(clients),
            "online": online,
            "clients": clients,
        }
    }


@app.get("/api/v1/admin/clients/{user_id}/activity")
def admin_client_activity(
    user_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin_user),
):
    try:
        payload = build_client_activity_timeline(db, user_id=user_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Client introuvable.")
    return {"data": payload}


# -------------------------------------------------------------------
# Services & Prestations Endpoints
# -------------------------------------------------------------------
@app.get("/api/v1/services")
def list_services(db: Session = Depends(get_db)):
    services = db.query(Service).all()
    return {"data": [_service_to_dict(srv) for srv in services]}

@app.post("/api/v1/admin/services")
def create_service(req: ServiceCreate, db: Session = Depends(get_db), _admin: User = Depends(require_admin_user)):
    srv = Service(**req.model_dump())
    db.add(srv)
    db.commit()
    db.refresh(srv)
    return {"message": "Prestation ajoutée", "data": srv}

# -------------------------------------------------------------------
# Testimonials / Avis Endpoints
# -------------------------------------------------------------------
@app.get("/api/v1/testimonials")
def list_testimonials(db: Session = Depends(get_db)):
    items = db.query(Testimonial).filter(Testimonial.is_published == True).all()
    return {"data": [_testimonial_to_dict(t) for t in items]}

@app.get("/api/v1/admin/testimonials")
def admin_list_testimonials(db: Session = Depends(get_db), _admin: User = Depends(require_admin_user)):
    items = db.query(Testimonial).all()
    return {"data": [_testimonial_to_dict(t) for t in items]}

@app.post("/api/v1/admin/testimonials/save-all")
def save_all_testimonials(payload: TestimonialsSaveAll, db: Session = Depends(get_db), _admin: User = Depends(require_admin_user)):
    db.query(Testimonial).delete()
    for item in payload.testimonials:
        if not isinstance(item, dict):
            continue
        db.add(Testimonial(
            id=str(item.get("id", uuid.uuid4())),
            client_name=str(item.get("clientName", "Client")),
            client_role=str(item.get("clientRole", "Client Studio")),
            rating=safe_int(item.get("rating"), 5),
            content=str(item.get("content", "")),
            avatar_url=item.get("avatarUrl"),
            is_published=bool(item.get("isPublished", False)),
        ))
    db.commit()
    return {"status": "success", "count": len(payload.testimonials)}

def _testimonial_to_dict(t: Testimonial) -> Dict[str, Any]:
    return {
        "id": t.id,
        "clientName": t.client_name,
        "clientRole": t.client_role,
        "rating": t.rating,
        "content": t.content,
        "avatarUrl": t.avatar_url,
        "isPublished": t.is_published,
        "createdAt": t.created_at.strftime("%d %B %Y") if t.created_at else "",
    }

def _slugify_blog_title(title: str) -> str:
    import re
    import unicodedata

    s = unicodedata.normalize("NFKD", (title or "").lower())
    s = s.encode("ascii", "ignore").decode("ascii")
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_]+", "-", s).strip("-")
    return s or str(uuid.uuid4())[:8]


def _normalize_blog_posts(posts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    seen_slugs: set = set()
    normalized: List[Dict[str, Any]] = []
    for raw in posts:
        post = dict(raw)
        slug = str(post.get("slug") or _slugify_blog_title(str(post.get("title", ""))))
        base = slug
        counter = 2
        while slug in seen_slugs:
            slug = f"{base}-{counter}"
            counter += 1
        post["slug"] = slug
        seen_slugs.add(slug)
        normalized.append(post)
    return normalized


def _get_blog_posts_from_db(db: Session) -> List[Dict[str, Any]]:
    setting = db.query(Setting).filter(Setting.key == BLOG_POSTS_KEY).first()
    if setting and setting.value:
        try:
            parsed = json.loads(setting.value)
            if isinstance(parsed, list):
                return parsed
        except Exception:
            pass
    return []

@app.get("/api/v1/blog")
def list_public_blog_posts(db: Session = Depends(get_db)):
    posts = _get_blog_posts_from_db(db)
    return {"data": [p for p in posts if p.get("isPublished", True)]}

@app.get("/api/v1/blog/{slug}")
def get_public_blog_post(slug: str, db: Session = Depends(get_db)):
    posts = _get_blog_posts_from_db(db)
    post = next(
        (p for p in posts if str(p.get("slug", "")) == slug or str(p.get("id", "")) == slug),
        None,
    )
    if not post or not post.get("isPublished", True):
        raise HTTPException(status_code=404, detail="Article introuvable")
    return {"data": post}

@app.get("/api/v1/admin/blog")
def admin_list_blog_posts(db: Session = Depends(get_db), _admin: User = Depends(require_admin_user)):
    return {"data": _get_blog_posts_from_db(db)}

@app.post("/api/v1/admin/blog/save-all")
def save_all_blog_posts(payload: BlogPostsSaveAll, db: Session = Depends(get_db), _admin: User = Depends(require_admin_user)):
    posts = _normalize_blog_posts(payload.posts)
    existing = db.query(Setting).filter(Setting.key == BLOG_POSTS_KEY).first()
    val_str = json.dumps(posts)
    if existing:
        existing.value = val_str
    else:
        db.add(Setting(key=BLOG_POSTS_KEY, value=val_str))
    db.commit()
    return {"status": "success", "count": len(posts), "data": posts}


def _get_faq_items_from_db(db: Session) -> List[Dict[str, Any]]:
    setting = db.query(Setting).filter(Setting.key == FAQ_ITEMS_KEY).first()
    if setting and setting.value:
        try:
            parsed = json.loads(setting.value)
            if isinstance(parsed, list):
                return sorted(parsed, key=lambda x: int(x.get("order", 0)))
        except Exception:
            pass
    return []


@app.get("/api/v1/faq")
def list_public_faq(db: Session = Depends(get_db)):
    items = _get_faq_items_from_db(db)
    return {"data": [i for i in items if i.get("isPublished", True)]}


@app.get("/api/v1/admin/faq")
def admin_list_faq(db: Session = Depends(get_db), _admin: User = Depends(require_admin_user)):
    return {"data": _get_faq_items_from_db(db)}


@app.post("/api/v1/admin/faq/save-all")
def save_all_faq(payload: FaqSaveAll, db: Session = Depends(get_db), _admin: User = Depends(require_admin_user)):
    items: List[Dict[str, Any]] = []
    for idx, raw in enumerate(payload.items):
        item = dict(raw)
        if not item.get("id"):
            item["id"] = f"faq-{uuid.uuid4().hex[:8]}"
        item["order"] = int(item.get("order", idx))
        items.append(item)
    items.sort(key=lambda x: int(x.get("order", 0)))
    existing = db.query(Setting).filter(Setting.key == FAQ_ITEMS_KEY).first()
    val_str = json.dumps(items)
    if existing:
        existing.value = val_str
    else:
        db.add(Setting(key=FAQ_ITEMS_KEY, value=val_str))
    db.commit()
    return {"status": "success", "count": len(items), "data": items}


def _append_json_setting(db: Session, key: str, item: Dict[str, Any]) -> Dict[str, Any]:
    from datetime import datetime
    setting = db.query(Setting).filter(Setting.key == key).first()
    items: List[Dict[str, Any]] = []
    if setting and setting.value:
        try:
            parsed = json.loads(setting.value)
            if isinstance(parsed, list):
                items = parsed
        except Exception:
            items = []
    entry = {
        **item,
        "id": str(uuid.uuid4()),
        "status": item.get("status", "pending"),
        "createdAt": datetime.utcnow().strftime("%d/%m/%Y %H:%M"),
    }
    if key == BOOKINGS_KEY and "reference" not in entry:
        entry["reference"] = f"RES-{datetime.utcnow().year}-{entry['id'][:8].upper()}"
    items.insert(0, entry)
    val_str = json.dumps(items)
    if setting:
        setting.value = val_str
    else:
        db.add(Setting(key=key, value=val_str, group="crm"))
    db.commit()
    return entry


def _get_json_setting_list(db: Session, key: str) -> List[Dict[str, Any]]:
    return get_json_setting_list(db, key)


def _save_json_setting_list(db: Session, key: str, items: List[Dict[str, Any]], *, commit: bool = True) -> None:
    setting = db.query(Setting).filter(Setting.key == key).first()
    val_str = json.dumps(items)
    if setting:
        setting.value = val_str
    else:
        db.add(Setting(key=key, value=val_str, group="crm"))
    if commit:
        db.commit()


def _find_booking_index(items: List[Dict[str, Any]], booking_id: str) -> int:
    for idx, item in enumerate(items):
        if str(item.get("id")) == str(booking_id):
            return idx
    return -1


def _load_stripe_webhook_secret(db: Session) -> str:
    setting = db.query(Setting).filter(Setting.key == "stripeWebhookSecret").first()
    if setting and setting.value:
        try:
            val = json.loads(setting.value)
            if isinstance(val, str) and val.strip():
                return val.strip()
        except Exception:
            if setting.value.strip():
                return setting.value.strip()
    env_secret = os.getenv("STRIPE_WEBHOOK_SECRET", "").strip()
    if env_secret:
        return env_secret
    return ""


def _apply_booking_payment(
    db: Session,
    booking_id: str,
    *,
    payment_intent: Optional[str] = None,
    session_id: Optional[str] = None,
) -> bool:
    from datetime import datetime

    items = _get_json_setting_list(db, BOOKINGS_KEY)
    idx = _find_booking_index(items, booking_id)
    if idx < 0:
        return False

    item = items[idx]
    if item.get("paymentStatus") == "paid":
        return True

    item["paymentStatus"] = "paid"
    item["status"] = "confirmed"
    item["paymentMethod"] = "Stripe (Carte)"
    if payment_intent:
        item["stripePaymentIntent"] = payment_intent
    if session_id:
        item["stripeSessionId"] = session_id
    item["paidAt"] = datetime.utcnow().strftime("%d/%m/%Y %H:%M")
    if not item.get("invoiceNumber"):
        item["invoiceNumber"] = f"FAC-{datetime.utcnow().year}-{str(booking_id)[:6].upper()}"

    items[idx] = item
    _save_json_setting_list(db, BOOKINGS_KEY, items)
    return True


def _get_studio_currency(db: Session) -> str:
    return resolve_studio_currency(_get_setting_scalar(db, "currency", DEFAULT_STUDIO_CURRENCY))


def _get_setting_scalar(db: Session, key: str, default=None):
    setting = db.query(Setting).filter(Setting.key == key).first()
    if not setting or not setting.value:
        return default
    try:
        return json.loads(setting.value)
    except Exception:
        return setting.value


def _normalize_transaction_reference(value: str) -> str:
    return "".join((value or "").upper().split())


def _confirm_mobile_money_payment(
    db: Session,
    booking_id: str,
    transaction_reference: str,
) -> Optional[Dict[str, Any]]:
    from datetime import datetime

    items = _get_json_setting_list(db, BOOKINGS_KEY)
    idx = _find_booking_index(items, booking_id)
    if idx < 0:
        return None

    item = items[idx]
    if item.get("paymentStatus") == "paid":
        return item
    if item.get("paymentStatus") != "mobile_money_pending":
        return None

    expected = _normalize_transaction_reference(str(item.get("mobileMoneyReference") or ""))
    provided = _normalize_transaction_reference(transaction_reference)
    if not expected:
        raise HTTPException(status_code=400, detail="Aucune référence enregistrée pour ce paiement Mobile Money.")
    if not provided:
        raise HTTPException(status_code=400, detail="Veuillez saisir la référence de transaction.")
    if provided != expected:
        raise HTTPException(
            status_code=400,
            detail="Référence de transaction incorrecte. Vérifiez la référence déclarée par le client et saisissez la bonne.",
        )

    item["paymentStatus"] = "paid"
    item["status"] = "confirmed"
    item["paymentMethod"] = "Mobile Money"
    item["paidAt"] = datetime.utcnow().strftime("%d/%m/%Y %H:%M")
    item["mobileMoneyConfirmedAt"] = item["paidAt"]
    item["mobileMoneyConfirmedReference"] = str(item.get("mobileMoneyReference") or "").strip()
    if not item.get("invoiceNumber"):
        item["invoiceNumber"] = f"FAC-{datetime.utcnow().year}-{str(booking_id)[:6].upper()}"

    items[idx] = item
    _save_json_setting_list(db, BOOKINGS_KEY, items)
    return item


def _resolve_booking_payment_method(booking: Dict[str, Any]) -> str:
    stored = booking.get("paymentMethod")
    if isinstance(stored, str) and stored.strip():
        return stored.strip()
    if booking.get("paymentStatus") == "paid":
        if booking.get("stripeSessionId") or booking.get("stripePaymentIntent"):
            return "Stripe (Carte)"
        if booking.get("mobileMoneyReference"):
            return "Mobile Money"
    return "Virement"


def _get_booking_by_id(db: Session, booking_id: str) -> Optional[Dict[str, Any]]:
    items = _get_json_setting_list(db, BOOKINGS_KEY)
    idx = _find_booking_index(items, booking_id)
    if idx < 0:
        return None
    return items[idx]


def _load_stripe_secret(db: Session) -> str:
    setting = db.query(Setting).filter(Setting.key == "stripeSecretKey").first()
    if setting and setting.value:
        try:
            val = json.loads(setting.value)
            if isinstance(val, str) and val.strip():
                return val.strip()
        except Exception:
            if setting.value.strip():
                return setting.value.strip()
    env_key = os.getenv("STRIPE_SECRET_KEY", "").strip()
    if env_key:
        return env_key
    if is_development():
        return os.getenv("STRIPE_SECRET_KEY", "sk_test_placeholder")
    raise HTTPException(status_code=503, detail="Stripe n'est pas configuré sur ce serveur.")


def _bg_notify_contact(entry: Dict[str, Any]) -> None:
    db = SessionLocal()
    try:
        notify_contact_received(db, entry)
    finally:
        db.close()


def _bg_notify_booking(entry: Dict[str, Any]) -> None:
    db = SessionLocal()
    try:
        notify_booking_created(db, entry)
    finally:
        db.close()


def _bg_notify_payment(entry: Dict[str, Any]) -> None:
    db = SessionLocal()
    try:
        notify_payment_received(db, entry)
    finally:
        db.close()


def _bg_notify_session_confirmed(entry: Dict[str, Any]) -> None:
    db = SessionLocal()
    try:
        notify_session_confirmed(db, entry)
    finally:
        db.close()


def _resolve_gallery_delivery_email(db: Session, gallery: Gallery, booking: Optional[Dict[str, Any]] = None) -> str:
    for candidate in (
        (gallery.client_email or "").strip(),
        (booking.get("email") if booking else "") or "",
    ):
        if candidate and "@" in candidate:
            return candidate

    registered = (
        db.query(User)
        .filter(User.role == "client", User.status == "active")
        .filter(User.email == (gallery.client_email or "").strip())
        .first()
    )
    if registered and registered.email:
        return registered.email.strip()

    client_name = (gallery.client_name or "").strip().lower()
    if client_name:
        for user in db.query(User).filter(User.role == "client", User.status == "active").all():
            full = f"{user.first_name or ''} {user.last_name or ''}".strip().lower()
            if full and full == client_name and user.email:
                return user.email.strip()
    return ""


def _gallery_booking_reference(db: Session, gallery: Gallery) -> str:
    if not gallery.booking_id:
        return ""
    booking = _get_booking_by_id(db, str(gallery.booking_id))
    return str(booking.get("reference") or "") if booking else ""


def _send_gallery_access_sync(
    db: Session,
    gallery: Gallery,
    booking: Optional[Dict[str, Any]] = None,
    *,
    plain_password: Optional[str] = None,
) -> tuple[bool, str, Optional[str], str]:
    delivery_email = _resolve_gallery_delivery_email(db, gallery, booking)
    if not delivery_email:
        return False, "", "Email client introuvable. Renseignez l'email sur la galerie ou choisissez un client enregistré.", ""

    password_for_email = (plain_password or "").strip()
    if not password_for_email:
        if is_stored_password_hash(gallery.password):
            password_for_email = regenerate_gallery_password(db, gallery)
        else:
            password_for_email = (gallery.password or "").strip()

    ok, err = send_gallery_access_for_gallery(
        db,
        gallery,
        delivery_email=delivery_email,
        booking_reference=_gallery_booking_reference(db, gallery),
        plain_password=password_for_email,
    )
    return ok, delivery_email, err, password_for_email


def _bg_send_gallery_access(booking_id: str) -> None:
    db = SessionLocal()
    try:
        booking = _get_booking_by_id(db, booking_id)
        if not booking:
            return
        gallery = get_gallery_for_booking(db, booking_id)
        plain_password = None
        if not gallery:
            gallery, plain_password = create_gallery_for_booking(
                db,
                booking,
                get_json_setting_list=_get_json_setting_list,
                find_booking_index=_find_booking_index,
                save_json_setting_list=_save_json_setting_list,
            )
        if gallery:
            ok, email, err, _pwd = _send_gallery_access_sync(
                db, gallery, booking, plain_password=plain_password
            )
            if ok:
                print(f"[GALLERY EMAIL] Accès envoyé à {email}")
            else:
                print(f"[GALLERY EMAIL] Échec envoi à {email or booking.get('email', '?')} : {err}")
    finally:
        db.close()


def _bg_notify_gallery_photos(payload: Dict[str, Any]) -> None:
    db = SessionLocal()
    try:
        append_gallery_photo_notification(db, payload)

        booking_ref = ""
        booking_id = payload.get("bookingId")
        if booking_id:
            booking = _get_booking_by_id(db, str(booking_id))
            if booking:
                booking_ref = str(booking.get("reference") or "")

        gallery = db.query(Gallery).filter(Gallery.id == str(payload.get("galleryId"))).first()
        client_name = gallery.client_name if gallery else "Client"

        send_gallery_photos_ready_email(
            db,
            client_email=str(payload.get("clientEmail") or ""),
            client_name=client_name,
            gallery_title=str(payload.get("title") or "Galerie"),
            access_key=str(payload.get("accessKey") or ""),
            password=str(payload.get("password") or ""),
            new_photos_count=int(payload.get("addedCount") or 0),
            booking_reference=booking_ref,
        )
    finally:
        db.close()


@app.post("/api/v1/contact")
def create_contact_message(
    req: ContactCreate,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    check_rate_limit(f"contact:{extract_client_ip(request)}", max_attempts=5, window_seconds=3600)
    if req.website and req.website.strip():
        raise HTTPException(status_code=400, detail="Requête rejetée.")
    if req.form_started_at:
        import time
        elapsed_ms = int(time.time() * 1000) - req.form_started_at
        if elapsed_ms < 2000:
            raise HTTPException(status_code=400, detail="Veuillez patienter avant d'envoyer le formulaire.")
    if not req.name.strip() or not req.message.strip() or not req.email.strip():
        raise HTTPException(status_code=400, detail="Nom, email et message requis")
    entry = _append_json_setting(db, CONTACT_MESSAGES_KEY, {
        "name": req.name.strip(),
        "email": req.email.strip(),
        "phone": req.phone,
        "subject": req.subject,
        "message": req.message.strip(),
        "type": "contact",
    })
    background_tasks.add_task(_bg_notify_contact, dict(entry))
    return {"message": "Message envoyé avec succès", "data": entry}

@app.get("/api/v1/bookings/availability")
def booking_availability(
    date: str,
    service_id: str,
    service_title: str = "",
    time: str = "",
    db: Session = Depends(get_db),
):
    bookings = _get_json_setting_list(db, BOOKINGS_KEY)
    category = None
    if service_id:
        srv = db.query(Service).filter(Service.id == service_id).first()
        if srv:
            category = srv.category
    wedding = is_wedding_service(service_id, service_title, category)
    data = evaluate_slot_availability(
        bookings,
        date,
        time or DEFAULT_TIME_SLOTS[0],
        is_wedding=wedding,
    )
    if not time:
        data["selectedSlotTaken"] = False
        data["suggestion"] = None
        data["message"] = None
    return {"data": data}


@app.post("/api/v1/bookings")
def create_booking(
    req: BookingCreate,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    check_rate_limit(f"booking:{extract_client_ip(request)}", max_attempts=8, window_seconds=3600)
    service_title, total_price, deposit_amount = resolve_booking_pricing(
        db, req.service_id, req.service_title or ""
    )
    category = None
    srv = db.query(Service).filter(Service.id == req.service_id).first()
    if srv:
        category = srv.category
    wedding = is_wedding_service(req.service_id, service_title, category)

    bookings = _get_json_setting_list(db, BOOKINGS_KEY)
    slot = normalize_time(req.time)
    booked = get_booked_times_for_date(bookings, req.date)
    if slot in booked:
        suggestion = suggest_alternative_slot(
            bookings,
            req.date,
            slot,
            is_wedding=wedding,
        )
        message = build_slot_conflict_message(
            req.date,
            slot,
            is_wedding=wedding,
            suggestion=suggestion,
        )
        raise HTTPException(
            status_code=409,
            detail={
                "code": "SLOT_TAKEN",
                "message": message,
                "isWedding": wedding,
                "suggestion": suggestion,
            },
        )

    currency = _get_studio_currency(db)
    preferred = (req.preferred_payment_method or "").strip().lower()
    entry = _append_json_setting(db, BOOKINGS_KEY, {
        "serviceId": req.service_id,
        "serviceTitle": service_title,
        "date": req.date,
        "time": req.time,
        "firstName": req.first_name,
        "lastName": req.last_name,
        "email": req.email,
        "phone": req.phone,
        "location": req.location,
        "notes": req.notes,
        "depositAmount": deposit_amount,
        "totalPrice": total_price,
        "paymentStatus": "unpaid",
        "preferredPaymentMethod": preferred or None,
        "currency": currency,
        "type": "booking",
    })
    gallery, _plain_password = create_gallery_for_booking(
        db,
        entry,
        get_json_setting_list=_get_json_setting_list,
        find_booking_index=_find_booking_index,
        save_json_setting_list=_save_json_setting_list,
    )
    if gallery:
        entry = _get_booking_by_id(db, str(entry["id"])) or entry
    background_tasks.add_task(_bg_notify_booking, dict(entry))
    background_tasks.add_task(_bg_send_gallery_access, str(entry["id"]))
    return {"message": "Demande de réservation enregistrée", "data": entry}

@app.get("/api/v1/admin/contact-messages")
def admin_list_contact_messages(db: Session = Depends(get_db), _admin: User = Depends(require_admin_user)):
    return {"data": _get_json_setting_list(db, CONTACT_MESSAGES_KEY)}

@app.get("/api/v1/admin/bookings")
def admin_list_bookings(db: Session = Depends(get_db), _admin: User = Depends(require_admin_user)):
    return {"data": _get_json_setting_list(db, BOOKINGS_KEY)}


@app.patch("/api/v1/admin/bookings/{booking_id}/status")
def update_booking_status(
    booking_id: str,
    payload: BookingStatusUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin_user),
):
    allowed = {"pending", "confirmed", "completed", "cancelled"}
    new_status = (payload.status or "").strip().lower()
    if new_status not in allowed:
        raise HTTPException(status_code=400, detail="Statut invalide.")

    items = _get_json_setting_list(db, BOOKINGS_KEY)
    idx = _find_booking_index(items, booking_id)
    if idx < 0:
        raise HTTPException(status_code=404, detail="Réservation introuvable.")

    items[idx]["status"] = new_status
    _save_json_setting_list(db, BOOKINGS_KEY, items)
    return {"status": "success", "data": items[idx]}


@app.patch("/api/v1/admin/bookings/{booking_id}")
def update_booking(
    booking_id: str,
    payload: BookingUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin_user),
):
    items = _get_json_setting_list(db, BOOKINGS_KEY)
    idx = _find_booking_index(items, booking_id)
    if idx < 0:
        raise HTTPException(status_code=404, detail="Réservation introuvable.")

    item = items[idx]
    field_map = {
        "first_name": "firstName",
        "last_name": "lastName",
        "email": "email",
        "service_title": "serviceTitle",
        "date": "date",
        "time": "time",
        "location": "location",
        "total_price": "totalPrice",
        "deposit_amount": "depositAmount",
        "status": "status",
    }
    updates = payload.model_dump(exclude_unset=True)
    for src, dest in field_map.items():
        if src in updates and updates[src] is not None:
            item[dest] = updates[src]

    items[idx] = item
    _save_json_setting_list(db, BOOKINGS_KEY, items)
    return {"status": "success", "data": item}


@app.delete("/api/v1/admin/bookings/{booking_id}")
def delete_booking_permanently(
    booking_id: str,
    db: Session = Depends(get_db),
    _superuser: User = Depends(require_superuser),
):
    """Suppression définitive d'une réservation (et de la facture associée) — superUser uniquement."""
    items = _get_json_setting_list(db, BOOKINGS_KEY)
    idx = _find_booking_index(items, booking_id)
    if idx < 0:
        raise HTTPException(status_code=404, detail="Réservation introuvable.")

    removed = items.pop(idx)
    _save_json_setting_list(db, BOOKINGS_KEY, items)
    return {
        "status": "success",
        "message": "Réservation et facture supprimées définitivement.",
        "data": {"id": removed.get("id"), "reference": removed.get("reference")},
    }


@app.get("/api/v1/admin/bookings/{booking_id}/gallery")
def admin_get_booking_gallery(
    booking_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin_user),
):
    booking = _get_booking_by_id(db, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Réservation introuvable.")

    gallery = get_gallery_for_booking(db, booking_id)
    if not gallery and booking.get("galleryId"):
        gallery = db.query(Gallery).filter(Gallery.id == str(booking["galleryId"])).first()
    if not gallery:
        gallery, plain_password = create_gallery_for_booking(
            db,
            booking,
            get_json_setting_list=_get_json_setting_list,
            find_booking_index=_find_booking_index,
            save_json_setting_list=_save_json_setting_list,
        )
    else:
        plain_password = None
    if not gallery:
        raise HTTPException(status_code=404, detail="Aucune galerie liée à cette réservation.")

    return {
        "status": "success",
        "data": _gallery_to_dict(gallery, include_password=True, plain_password_override=plain_password),
    }


@app.post("/api/v1/admin/bookings/{booking_id}/send-gallery-access")
def admin_send_booking_gallery_access(
    booking_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin_user),
):
    booking = _get_booking_by_id(db, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Réservation introuvable.")

    gallery = get_gallery_for_booking(db, booking_id)
    plain_password = None
    if not gallery:
        gallery, plain_password = create_gallery_for_booking(
            db,
            booking,
            get_json_setting_list=_get_json_setting_list,
            find_booking_index=_find_booking_index,
            save_json_setting_list=_save_json_setting_list,
        )
    if not gallery:
        raise HTTPException(status_code=500, detail="Impossible de créer la galerie.")

    ok, delivery_email, err, emailed_password = _send_gallery_access_sync(
        db, gallery, booking, plain_password=plain_password
    )
    if not ok:
        raise HTTPException(status_code=503, detail=err or "Échec d'envoi de l'email galerie.")

    return {
        "status": "success",
        "message": f"Accès galerie envoyé à {delivery_email}.",
        "data": _gallery_to_dict(
            gallery,
            include_password=True,
            plain_password_override=emailed_password or None,
        ),
    }


@app.post("/api/v1/admin/galleries/{gallery_id}/send-access")
def admin_send_gallery_access(
    gallery_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin_user),
):
    gallery = db.query(Gallery).filter(Gallery.id == gallery_id).first()
    if not gallery:
        raise HTTPException(status_code=404, detail="Galerie introuvable.")
    if not gallery.is_private:
        raise HTTPException(status_code=400, detail="Cette galerie est publique — aucune clé à envoyer.")

    booking = None
    if gallery.booking_id:
        booking = _get_booking_by_id(db, str(gallery.booking_id))

    ok, delivery_email, err, emailed_password = _send_gallery_access_sync(db, gallery, booking)
    if not ok:
        raise HTTPException(status_code=503, detail=err or "Échec d'envoi de l'email galerie.")

    if not gallery.client_email and delivery_email:
        gallery.client_email = delivery_email
        db.commit()

    return {
        "status": "success",
        "message": f"Accès galerie envoyé à {delivery_email}.",
        "data": _gallery_to_dict(
            gallery,
            include_password=True,
            plain_password_override=emailed_password or None,
        ),
    }


@app.post("/api/v1/bookings/stripe/create-checkout-session")
def create_stripe_checkout_session(payload: StripeCheckoutCreate, request: Request, db: Session = Depends(get_db)):
    check_rate_limit(f"stripe-checkout:{extract_client_ip(request)}", max_attempts=15, window_seconds=3600)
    import stripe

    items = _get_json_setting_list(db, BOOKINGS_KEY)
    idx = _find_booking_index(items, payload.booking_id)
    if idx < 0:
        raise HTTPException(status_code=404, detail="Réservation introuvable.")

    booking = items[idx]
    deposit = float(booking.get("depositAmount") or 0)
    if deposit <= 0:
        raise HTTPException(status_code=400, detail="Montant d'acompte invalide.")

    app_base = os.getenv("NEXT_PUBLIC_APP_URL") or os.getenv("APP_URL") or "http://localhost:3000"
    success_url = validate_redirect_url(payload.success_url, app_base=app_base)
    cancel_url = validate_redirect_url(payload.cancel_url, app_base=app_base)

    stripe.api_key = _load_stripe_secret(db)
    stripe_currency = parse_currency_code(booking.get("currency") or _get_studio_currency(db))
    amount_cents = int(round(deposit * 100))
    if stripe_currency in {"xof", "jpy", "kmf", "xaf", "xpf", "bif", "clp", "djf", "gnf", "isk", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv"}:
        amount_cents = int(round(deposit))

    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": stripe_currency,
                        "product_data": {
                            "name": f"Acompte — {booking.get('serviceTitle', 'Séance photo')}",
                            "description": f"Réservation {booking.get('reference', booking.get('id'))} — {booking.get('date')} à {booking.get('time')}",
                        },
                        "unit_amount": amount_cents,
                    },
                    "quantity": 1,
                }
            ],
            customer_email=booking.get("email"),
            metadata={
                "booking_id": str(booking.get("id")),
                "reference": str(booking.get("reference", "")),
            },
            success_url=success_url,
            cancel_url=cancel_url,
        )
    except stripe.error.StripeError as exc:
        raise HTTPException(status_code=502, detail=f"Erreur Stripe: {exc.user_message or str(exc)}")

    booking["stripeSessionId"] = session.id
    booking["paymentStatus"] = "pending"
    items[idx] = booking
    _save_json_setting_list(db, BOOKINGS_KEY, items)

    return {"checkoutUrl": session.url, "sessionId": session.id}


@app.get("/api/v1/bookings/stripe/session-status")
def stripe_session_status(
    session_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    import stripe

    if not session_id:
        raise HTTPException(status_code=400, detail="session_id requis")

    stripe.api_key = _load_stripe_secret(db)
    try:
        session = stripe.checkout.Session.retrieve(session_id)
    except stripe.error.StripeError as exc:
        raise HTTPException(status_code=502, detail=f"Erreur Stripe: {exc.user_message or str(exc)}")

    booking_id = (session.metadata or {}).get("booking_id")
    paid = session.payment_status == "paid"

    if paid and booking_id:
        _apply_booking_payment(
            db,
            str(booking_id),
            payment_intent=str(session.payment_intent) if session.payment_intent else None,
            session_id=session.id,
        )
        booking = _get_booking_by_id(db, str(booking_id))
        if booking:
            background_tasks.add_task(_bg_notify_payment, dict(booking))

    return {
        "paid": paid,
        "paymentStatus": session.payment_status,
        "bookingId": booking_id,
    }


@app.post("/api/v1/bookings/mobile-money/submit")
def submit_mobile_money_payment(payload: MobileMoneyPaymentSubmit, request: Request, db: Session = Depends(get_db)):
    check_rate_limit(f"mobile-money:{extract_client_ip(request)}", max_attempts=10, window_seconds=3600)
    if not _get_setting_scalar(db, "mobileMoneyEnabled", False):
        raise HTTPException(status_code=400, detail="Le paiement Mobile Money n'est pas disponible.")

    payer_phone = (payload.payer_phone or "").strip()
    transaction_reference = (payload.transaction_reference or "").strip()
    if len(payer_phone) < 6:
        raise HTTPException(status_code=400, detail="Numéro Mobile Money invalide.")
    if len(transaction_reference) < 4:
        raise HTTPException(status_code=400, detail="Référence de transaction requise.")

    items = _get_json_setting_list(db, BOOKINGS_KEY)
    idx = _find_booking_index(items, payload.booking_id)
    if idx < 0:
        raise HTTPException(status_code=404, detail="Réservation introuvable.")

    item = items[idx]
    if item.get("paymentStatus") == "paid":
        raise HTTPException(status_code=400, detail="Cette réservation est déjà payée.")

    item["paymentStatus"] = "mobile_money_pending"
    item["paymentMethod"] = "Mobile Money"
    item["mobileMoneyPhone"] = payer_phone
    item["mobileMoneyReference"] = transaction_reference
    item["mobileMoneySubmittedAt"] = datetime.utcnow().strftime("%d/%m/%Y %H:%M")
    items[idx] = item
    _save_json_setting_list(db, BOOKINGS_KEY, items)

    return {
        "message": "Paiement Mobile Money enregistré. Le studio validera votre acompte sous peu.",
        "data": item,
    }


@app.post("/api/v1/admin/bookings/{booking_id}/confirm-mobile-money")
def confirm_mobile_money_payment(
    booking_id: str,
    payload: MobileMoneyConfirm,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin_user),
):
    try:
        item = _confirm_mobile_money_payment(db, booking_id, payload.transaction_reference)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if item is None:
        items = _get_json_setting_list(db, BOOKINGS_KEY)
        idx = _find_booking_index(items, booking_id)
        if idx < 0:
            raise HTTPException(status_code=404, detail="Réservation introuvable.")
        if items[idx].get("paymentStatus") == "paid":
            return {"status": "success", "data": items[idx]}
        raise HTTPException(status_code=400, detail="Aucun paiement Mobile Money en attente pour cette réservation.")

    background_tasks.add_task(_bg_notify_session_confirmed, dict(item))
    return {"status": "success", "data": item}


@app.post("/api/v1/admin/bookings/{booking_id}/record-balance-payment")
def record_balance_payment(
    booking_id: str,
    payload: BalancePaymentRecord,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin_user),
):
    from datetime import datetime

    items = _get_json_setting_list(db, BOOKINGS_KEY)
    idx = _find_booking_index(items, booking_id)
    if idx < 0:
        raise HTTPException(status_code=404, detail="Réservation introuvable.")

    item = items[idx]
    if item.get("paymentStatus") != "paid":
        raise HTTPException(
            status_code=400,
            detail="L'acompte doit être réglé avant d'encaisser le solde.",
        )

    method = (payload.payment_method or "").strip()
    if method not in ALLOWED_BALANCE_PAYMENT_METHODS:
        raise HTTPException(status_code=400, detail="Mode de paiement invalide.")

    amount = round(float(payload.amount or 0), 2)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Montant invalide.")

    financials = compute_booking_financials(item)
    remaining = float(financials["remainingAmount"])
    if remaining <= 0:
        raise HTTPException(status_code=400, detail="Cette facture est déjà soldée.")
    if amount > remaining + 0.01:
        raise HTTPException(
            status_code=400,
            detail=f"Le montant dépasse le solde restant ({remaining:.2f}€).",
        )

    if item.get("balancePaidAmount"):
        raise HTTPException(
            status_code=400,
            detail="Un solde a déjà été enregistré pour cette réservation.",
        )

    item["balancePaidAmount"] = amount
    item["balancePaymentMethod"] = method
    item["balancePaidAt"] = datetime.utcnow().strftime("%d/%m/%Y %H:%M")
    if payload.transaction_reference:
        item["balancePaymentReference"] = payload.transaction_reference.strip()
    if payload.notes:
        item["balancePaymentNotes"] = payload.notes.strip()

    if not item.get("invoiceNumber"):
        item["invoiceNumber"] = f"FAC-{datetime.utcnow().year}-{str(booking_id)[:6].upper()}"

    updated_financials = compute_booking_financials(item)
    if updated_financials["status"] == "paid" and item.get("status") == "confirmed":
        item["status"] = "completed"

    items[idx] = item
    _save_json_setting_list(db, BOOKINGS_KEY, items)
    return {
        "status": "success",
        "message": "Solde enregistré avec succès.",
        "data": item,
        "invoice": booking_to_invoice(item, _get_studio_currency(db)),
    }


@app.get("/api/v1/admin/bookings/{booking_id}/invoice")
def admin_get_booking_invoice(
    booking_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin_user),
):
    booking = _get_booking_by_id(db, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Réservation introuvable.")
    return {"status": "success", "data": booking_to_invoice(booking, _get_studio_currency(db))}


@app.post("/api/v1/webhooks/stripe")
async def stripe_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    import stripe

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    webhook_secret = _load_stripe_webhook_secret(db)

    stripe.api_key = _load_stripe_secret(db)

    try:
        if not webhook_secret:
            raise HTTPException(status_code=503, detail="Webhook Stripe non configuré.")
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Signature webhook Stripe invalide.")
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Payload webhook invalide.")
    except stripe.error.StripeError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    event_type = event.get("type") if isinstance(event, dict) else event.type
    data_object = event.get("data", {}).get("object") if isinstance(event, dict) else event.data.object

    if event_type == "checkout.session.completed":
        metadata = data_object.get("metadata") if isinstance(data_object, dict) else data_object.metadata
        booking_id = (metadata or {}).get("booking_id")
        payment_intent = data_object.get("payment_intent") if isinstance(data_object, dict) else data_object.payment_intent
        session_id = data_object.get("id") if isinstance(data_object, dict) else data_object.id
        payment_status = data_object.get("payment_status") if isinstance(data_object, dict) else data_object.payment_status

        if booking_id and payment_status == "paid":
            _apply_booking_payment(
                db,
                str(booking_id),
                payment_intent=str(payment_intent) if payment_intent else None,
                session_id=str(session_id) if session_id else None,
            )
            booking = _get_booking_by_id(db, str(booking_id))
            if booking:
                background_tasks.add_task(_bg_notify_payment, dict(booking))

    return {"received": True}


def _get_read_notification_ids(db: Session) -> set:
    setting = db.query(Setting).filter(Setting.key == NOTIFICATIONS_READ_KEY).first()
    if setting and setting.value:
        try:
            parsed = json.loads(setting.value)
            if isinstance(parsed, list):
                return set(str(x) for x in parsed)
        except Exception:
            pass
    return set()


def _save_read_notification_ids(db: Session, ids: set) -> None:
    val_str = json.dumps(sorted(ids))
    setting = db.query(Setting).filter(Setting.key == NOTIFICATIONS_READ_KEY).first()
    if setting:
        setting.value = val_str
    else:
        db.add(Setting(key=NOTIFICATIONS_READ_KEY, value=val_str, group="crm"))
    db.commit()


def _get_manual_notifications(db: Session) -> List[Dict[str, Any]]:
    setting = db.query(Setting).filter(Setting.key == NOTIFICATIONS_MANUAL_KEY).first()
    if setting and setting.value:
        try:
            parsed = json.loads(setting.value)
            if isinstance(parsed, list):
                return parsed
        except Exception:
            pass
    return []


def _append_manual_notification(db: Session, item: Dict[str, Any]) -> Dict[str, Any]:
    from datetime import datetime
    items = _get_manual_notifications(db)
    entry = {
        **item,
        "id": str(item.get("id") or uuid.uuid4()),
        "createdAt": item.get("createdAt") or datetime.utcnow().strftime("%d/%m/%Y %H:%M"),
    }
    items.insert(0, entry)
    val_str = json.dumps(items[:200])
    setting = db.query(Setting).filter(Setting.key == NOTIFICATIONS_MANUAL_KEY).first()
    if setting:
        setting.value = val_str
    else:
        db.add(Setting(key=NOTIFICATIONS_MANUAL_KEY, value=val_str, group="crm"))
    db.commit()
    return entry


def _build_admin_notifications(db: Session) -> List[Dict[str, Any]]:
    from datetime import datetime

    notifications: List[Dict[str, Any]] = []
    settings_batch = get_json_settings_batch(db, [BOOKINGS_KEY, CONTACT_MESSAGES_KEY])

    for b in settings_batch.get(BOOKINGS_KEY, []):
        bid = str(b.get("id", ""))
        name = f"{b.get('firstName', '')} {b.get('lastName', '')}".strip() or b.get("email", "Client")
        ref = b.get("reference", bid[:8])
        created = b.get("createdAt") or datetime.utcnow().strftime("%d/%m/%Y %H:%M")

        notifications.append({
            "id": f"booking-{bid}",
            "type": "booking",
            "title": "Nouvelle réservation",
            "message": f"{name} — {b.get('serviceTitle', 'Prestation')} ({ref}) le {b.get('date')} à {b.get('time')}",
            "recipient": b.get("email") or name,
            "channels": ["internal"],
            "status": "recorded",
            "createdAt": created,
            "relatedId": bid,
        })

        if b.get("paymentStatus") == "paid":
            notifications.append({
                "id": f"payment-{bid}",
                "type": "payment",
                "title": "Acompte Stripe reçu",
                "message": f"{ref} — {b.get('depositAmount')}€ encaissés pour {name}",
                "recipient": b.get("email") or name,
                "channels": ["internal", "email"],
                "status": "recorded",
                "createdAt": b.get("paidAt") or created,
                "relatedId": bid,
            })

    for m in settings_batch.get(CONTACT_MESSAGES_KEY, []):
        mid = str(m.get("id", ""))
        notifications.append({
            "id": f"contact-{mid}",
            "type": "contact",
            "title": f"Message contact — {m.get('subject', 'Demande')}",
            "message": (m.get("message") or "")[:240],
            "recipient": f"{m.get('name', 'Prospect')} ({m.get('email', '')})",
            "channels": ["internal", "email"],
            "status": "recorded",
            "createdAt": m.get("createdAt") or datetime.utcnow().strftime("%d/%m/%Y %H:%M"),
            "relatedId": mid,
        })

    notifications.extend(_get_manual_notifications(db))

    def sort_key(n: Dict[str, Any]) -> str:
        return str(n.get("createdAt") or "")

    notifications.sort(key=sort_key, reverse=True)
    return notifications[:100]


def _build_admin_activity_logs(db: Session) -> List[Dict[str, Any]]:
    level_map = {
        "payment": "success",
        "booking": "info",
        "contact": "info",
        "system": "warning",
        "email": "info",
        "security": "warning",
        "admin": "info",
    }
    logs: List[Dict[str, Any]] = list(get_admin_activity_logs(db, limit=400))

    seen_ids = {str(log.get("id")) for log in logs}

    for n in _build_admin_notifications(db):
        log_id = str(n.get("id"))
        if log_id in seen_ids:
            continue
        log_type = str(n.get("type", "system"))
        logs.append({
            "id": log_id,
            "level": level_map.get(log_type, "info"),
            "source": log_type,
            "title": n.get("title"),
            "message": n.get("message"),
            "recipient": n.get("recipient"),
            "channels": n.get("channels", []),
            "createdAt": n.get("createdAt"),
            "relatedId": n.get("relatedId"),
        })
        seen_ids.add(log_id)

    logs.sort(key=lambda x: str(x.get("createdAtIso") or x.get("createdAt") or ""), reverse=True)
    return logs[:300]


@app.get("/api/v1/admin/logs")
def admin_activity_logs(db: Session = Depends(get_db), _admin: User = Depends(require_admin_user)):
    return {"data": _build_admin_activity_logs(db)}


@app.get("/api/v1/admin/logs/export")
def export_admin_activity_logs(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin_user),
):
    log_path = get_admin_log_file_path()
    if not os.path.isfile(log_path):
        entries = get_admin_activity_logs(db, limit=2000)
        os.makedirs(os.path.dirname(log_path), exist_ok=True)
        with open(log_path, "w", encoding="utf-8") as handle:
            for entry in reversed(entries):
                handle.write(json.dumps(entry, ensure_ascii=False) + "\n")

    filename = f"admin-activity-{datetime.utcnow().strftime('%Y%m%d')}.log"
    return FileResponse(
        log_path,
        media_type="text/plain; charset=utf-8",
        filename=filename,
    )


@app.get("/api/v1/admin/notifications")
def admin_list_notifications(db: Session = Depends(get_db), _admin: User = Depends(require_admin_user)):
    read_ids = _get_read_notification_ids(db)
    items = _build_admin_notifications(db)
    for n in items:
        n["read"] = str(n.get("id")) in read_ids
    unread = sum(1 for n in items if not n["read"])
    return {"data": items, "unreadCount": unread}


@app.post("/api/v1/admin/notifications/mark-read")
def mark_notifications_read(
    payload: NotificationMarkRead,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin_user),
):
    read_ids = _get_read_notification_ids(db)
    if payload.all:
        for n in _build_admin_notifications(db):
            read_ids.add(str(n.get("id")))
    elif payload.ids:
        for nid in payload.ids:
            read_ids.add(str(nid))
    _save_read_notification_ids(db, read_ids)
    return {"status": "success", "readCount": len(read_ids)}


@app.post("/api/v1/admin/notifications/test")
def send_test_notification(db: Session = Depends(get_db), _admin: User = Depends(require_admin_user)):
    from datetime import datetime
    entry = _append_manual_notification(db, {
        "type": "system",
        "title": "Test notification admin",
        "message": "Entrée de test enregistrée. Les canaux SMS/WhatsApp ne sont pas encore configurés — journal interne uniquement.",
        "recipient": "Administrateur",
        "channels": ["internal"],
        "status": "recorded",
        "createdAt": datetime.utcnow().strftime("%d/%m/%Y %H:%M"),
    })
    return {"status": "success", "message": "Notification de test enregistrée.", "data": entry}


@app.get("/api/v1/admin/email/connectivity")
def admin_email_connectivity(_admin: User = Depends(require_admin_user)):
    return check_email_connectivity()


@app.post("/api/v1/admin/email/test")
def admin_test_email(
    payload: AdminEmailTest,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin_user),
):
    to = (payload.to or admin_email(db)).strip()
    if not to:
        raise HTTPException(status_code=400, detail="Adresse email destinataire requise.")

    smtp_overrides: Dict[str, Any] = {}
    for field in ("smtpEnabled", "smtpHost", "smtpPort", "smtpUser", "smtpPassword", "smtpFrom", "gmailUseApi"):
        value = getattr(payload, field, None)
        if value is None:
            continue
        if isinstance(value, str) and not value.strip():
            continue
        smtp_overrides[field] = value

    live_delivery = payload.liveDelivery is not False

    if smtp_overrides:
        for key, val in smtp_overrides.items():
            existing = db.query(Setting).filter(Setting.key == key).first()
            val_str = json.dumps(val)
            if existing:
                existing.value = val_str
            else:
                db.add(Setting(key=key, value=val_str))
        db.commit()

    host = str(
        smtp_overrides.get("smtpHost")
        or get_setting_value(db, "smtpHost", "")
        or ""
    ).strip()
    if is_gmail_host(host):
        smtp_overrides["gmailUseApi"] = True
        existing = db.query(Setting).filter(Setting.key == "gmailUseApi").first()
        if existing:
            existing.value = json.dumps(True)
        else:
            db.add(Setting(key="gmailUseApi", value=json.dumps(True)))
        db.commit()

    ok, error = send_test_email(db, to, smtp_overrides or None)
    if not ok:
        raise HTTPException(
            status_code=503,
            detail=error or "Échec d'envoi. Vérifiez la configuration SMTP.",
        )
    host = str(smtp_overrides.get("smtpHost") or get_setting_value(db, "smtpHost", "") or "")
    message = f"Email de test envoyé à {to}."
    if is_gmail_host(host):
        if is_gmail_api_configured() and get_setting_bool(db, "gmailUseApi", False):
            message += " Envoi via API Gmail (HTTPS) — vérifiez la boîte du destinataire (et les spams)."
        else:
            message += " Envoi via Gmail — vérifiez la boîte du destinataire (et les spams)."
    elif live_delivery and is_mailtrap_live_host(host):
        message += " Livraison réelle Mailtrap — vérifiez la boîte du destinataire (et les spams)."
    elif is_mailtrap_sandbox_host(host):
        message += " Mode sandbox : consultez l'inbox Mailtrap (pas de livraison réelle)."
    elif is_mailtrap_live_host(host):
        message += " Envoi réel via Mailtrap — vérifiez la boîte du destinataire (et les spams)."
    return {"status": "success", "message": message, "liveDelivery": live_delivery}


def _admin_search_results(db: Session, query: str) -> List[Dict[str, Any]]:
    q = query.strip().lower()
    if len(q) < 2:
        return []

    results: List[Dict[str, Any]] = []

    for user in db.query(User).all():
        if is_superuser(user):
            continue
        haystack = " ".join(
            filter(
                None,
                [user.name, user.email, user.first_name, user.last_name, user.role],
            )
        ).lower()
        if q in haystack:
            results.append(
                {
                    "id": f"user-{user.id}",
                    "type": "user",
                    "title": user.name or user.email,
                    "subtitle": f"{user.email} • {user.role or 'client'}",
                    "href": "/admin/users",
                }
            )

    for booking in _get_json_setting_list(db, BOOKINGS_KEY):
        haystack = " ".join(
            filter(
                None,
                [
                    booking.get("reference"),
                    booking.get("firstName"),
                    booking.get("lastName"),
                    booking.get("email"),
                    booking.get("serviceTitle"),
                    booking.get("status"),
                ],
            )
        ).lower()
        if q in haystack:
            client = f"{booking.get('firstName', '')} {booking.get('lastName', '')}".strip()
            results.append(
                {
                    "id": f"booking-{booking.get('id')}",
                    "type": "booking",
                    "title": booking.get("reference") or "Réservation",
                    "subtitle": f"{client} — {booking.get('serviceTitle', '')}".strip(" —"),
                    "href": "/admin/reservations",
                }
            )

    for message in _get_json_setting_list(db, CONTACT_MESSAGES_KEY):
        haystack = " ".join(
            filter(
                None,
                [
                    message.get("name"),
                    message.get("email"),
                    message.get("subject"),
                    message.get("message"),
                ],
            )
        ).lower()
        if q in haystack:
            results.append(
                {
                    "id": f"contact-{message.get('id')}",
                    "type": "contact",
                    "title": message.get("subject") or "Message contact",
                    "subtitle": f"{message.get('name', 'Prospect')} ({message.get('email', '')})",
                    "href": "/admin/crm",
                }
            )

    for post in _get_blog_posts_from_db(db):
        haystack = " ".join(
            filter(None, [post.get("title"), post.get("category"), post.get("author"), post.get("slug")])
        ).lower()
        if q in haystack:
            results.append(
                {
                    "id": f"blog-{post.get('id')}",
                    "type": "blog",
                    "title": post.get("title") or "Article",
                    "subtitle": post.get("category") or "Blog",
                    "href": "/admin/blog",
                }
            )

    for gallery in db.query(Gallery).all():
        haystack = " ".join(
            filter(
                None,
                [
                    gallery.title,
                    gallery.client_name,
                    gallery.client_email,
                    gallery.access_key,
                    gallery.category,
                ],
            )
        ).lower()
        if q in haystack:
            results.append(
                {
                    "id": f"gallery-{gallery.id}",
                    "type": "gallery",
                    "title": gallery.title or "Galerie",
                    "subtitle": f"{gallery.client_name or 'Client'} • {gallery.access_key or ''}".strip(" •"),
                    "href": "/admin/galeries",
                }
            )

    return results[:25]


@app.get("/api/v1/admin/search")
def admin_search(
    q: str = "",
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin_user),
):
    return {"data": _admin_search_results(db, q)}


def _build_admin_backup_payload(db: Session) -> Dict[str, Any]:
    from datetime import datetime

    settings_map: Dict[str, Any] = {}
    secret_keys = {"stripeSecretKey", "stripeWebhookSecret", "smtpPassword"}
    for row in db.query(Setting).all():
        try:
            value = json.loads(row.value)
        except Exception:
            value = row.value
        if row.key in secret_keys:
            value = "[redacted]"
        settings_map[row.key] = value

    users = []
    for user in db.query(User).all():
        if is_superuser(user):
            continue
        users.append(
            {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "status": user.status,
            }
        )

    bookings = _get_json_setting_list(db, BOOKINGS_KEY)
    contact_messages = _get_json_setting_list(db, CONTACT_MESSAGES_KEY)
    blog_posts = _get_blog_posts_from_db(db)
    galleries = [_gallery_to_dict(g, include_password=True) for g in db.query(Gallery).all()]
    faq_items = _get_faq_items_from_db(db)

    services = []
    for service in db.query(Service).all():
        services.append(
            {
                "id": service.id,
                "title": service.title,
                "category": service.category,
                "price": float(service.price or 0),
                "deposit_percentage": int(service.deposit_percentage or 30),
                "duration_minutes": int(service.duration_minutes or 120),
                "photos_count": int(service.photos_count or 0),
                "cover_image": service.cover_image,
                "is_active": bool(service.is_active),
                "service_kind": getattr(service, "service_kind", None) or "photo",
            }
        )

    testimonials = []
    for testimonial in db.query(Testimonial).all():
        testimonials.append(
            {
                "id": testimonial.id,
                "client_name": testimonial.client_name,
                "client_role": testimonial.client_role,
                "rating": testimonial.rating,
                "content": testimonial.content,
                "is_published": bool(testimonial.is_published),
            }
        )

    exported_at = datetime.utcnow().isoformat() + "Z"
    counts = {
        "settings": len(settings_map),
        "users": len(users),
        "bookings": len(bookings),
        "contactMessages": len(contact_messages),
        "blogPosts": len(blog_posts),
        "galleries": len(galleries),
        "services": len(services),
        "testimonials": len(testimonials),
        "faqItems": len(faq_items),
    }

    return {
        "meta": {
            "version": 2,
            "exportedAt": exported_at,
            "counts": counts,
            "secretsRedacted": True,
        },
        "exportedAt": exported_at,
        "settings": settings_map,
        "bookings": bookings,
        "contactMessages": contact_messages,
        "blogPosts": blog_posts,
        "galleries": galleries,
        "services": services,
        "testimonials": testimonials,
        "faqItems": faq_items,
        "users": users,
    }


@app.get("/api/v1/admin/security/overview")
def admin_security_overview(
    request: Request,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin_user),
):
    from security import is_production, is_development, get_allowed_origins

    jwt_secret = os.getenv("JWT_SECRET_KEY", "ksw-dev-secret-change-in-production")
    smtp_host = str(get_setting_value(db, "smtpHost", "") or "").strip()
    smtp_user = str(get_setting_value(db, "smtpUser", "") or "").strip()
    smtp_password = str(get_setting_value(db, "smtpPassword", "") or "").strip()
    smtp_enabled = get_setting_bool(db, "smtpEnabled", False)

    staff_users = (
        db.query(User)
        .filter(User.role.in_(list(ADMIN_ROLES)))
        .count()
    )
    active_galleries = db.query(Gallery).filter(Gallery.deleted_at.is_(None)).count()
    private_galleries = db.query(Gallery).filter(Gallery.is_private.is_(True)).count()

    proto = (request.headers.get("x-forwarded-proto") or request.url.scheme or "http").split(",")[0].strip()
    backup_preview = _build_admin_backup_payload(db)

    return {
        "status": "success",
        "data": {
            "environment": "production" if is_production() else "development",
            "httpsEnabled": proto == "https",
            "jwtConfigured": not is_production() or jwt_secret != "ksw-dev-secret-change-in-production",
            "force2FAForAdmin": get_setting_bool(db, "force2FAForAdmin", True),
            "sessionLifetimeHours": max(1, min(168, get_setting_int(db, "sessionLifetimeHours", 8))),
            "smtpConfigured": bool(smtp_enabled and smtp_host and smtp_user and smtp_password),
            "gmailApiConfigured": is_gmail_api_configured(),
            "gmailApiMissing": gmail_api_missing_keys(),
            "gmailUseApi": get_setting_bool(db, "gmailUseApi", False),
            "rateLimitEnabled": True,
            "corsOriginsCount": len(get_allowed_origins()),
            "counts": {
                "staffUsers": staff_users,
                "clients": db.query(User).filter(User.role == "client").count(),
                "bookings": len(_get_json_setting_list(db, BOOKINGS_KEY)),
                "galleries": db.query(Gallery).count(),
                "activeGalleries": active_galleries,
                "privateGalleries": private_galleries,
                "blogPosts": len(_get_blog_posts_from_db(db)),
            },
            "backupPreview": backup_preview["meta"],
            "recommendations": _security_recommendations(db, proto == "https", jwt_secret),
        },
    }


def _security_recommendations(db: Session, https_enabled: bool, jwt_secret: str) -> List[str]:
    from security import is_production

    tips: List[str] = []
    if is_production() and jwt_secret == "ksw-dev-secret-change-in-production":
        tips.append("Définissez JWT_SECRET_KEY en production.")
    if is_production() and not https_enabled:
        tips.append("Activez HTTPS sur le domaine public.")
    if not get_setting_bool(db, "force2FAForAdmin", True):
        tips.append("La 2FA admin est désactivée — risque accru sur le backoffice.")
    if not get_setting_bool(db, "smtpEnabled", False):
        tips.append("Configurez SMTP pour les alertes et emails transactionnels.")
    if max(1, min(168, get_setting_int(db, "sessionLifetimeHours", 8))) > 24:
        tips.append("Durée de session admin supérieure à 24 h — envisagez de la réduire.")
    if not tips:
        tips.append("Configuration de sécurité satisfaisante. Pensez aux sauvegardes régulières.")
    return tips


@app.get("/api/v1/admin/backup/export")
def admin_export_backup(db: Session = Depends(get_db), _admin: User = Depends(require_super_admin)):
    return _build_admin_backup_payload(db)


BACKUP_SECRET_KEYS = {"stripeSecretKey", "stripeWebhookSecret", "smtpPassword"}
BACKUP_SKIP_SETTINGS_KEYS = {BOOKINGS_KEY, CONTACT_MESSAGES_KEY, FAQ_ITEMS_KEY, BLOG_POSTS_KEY}


def _upsert_setting_value(db: Session, key: str, value: Any, *, group: str = "general") -> None:
    if value is None:
        return
    val_str = json.dumps(value) if isinstance(value, (dict, list, bool)) else str(value)
    existing = db.query(Setting).filter(Setting.key == key).first()
    if existing:
        existing.value = val_str
    else:
        db.add(Setting(key=key, value=val_str, group=group))


def _restore_services_from_backup(db: Session, items: List[Dict[str, Any]], media_settings: Dict[str, Any]) -> int:
    db.query(Service).delete()
    count = 0
    for item in items:
        if not isinstance(item, dict):
            continue
        srv_id = str(item.get("id", f"srv-{uuid.uuid4()}"))
        dep_pct = item.get("depositPercentage") if item.get("depositPercentage") is not None else item.get("deposit_percentage")
        dur_min = item.get("durationMinutes") if item.get("durationMinutes") is not None else item.get("duration_minutes")
        pts_cnt = item.get("photosCount") if item.get("photosCount") is not None else item.get("photos_count")
        cov_img = item.get("coverImage") or item.get("cover_image")
        cov_img = maybe_process_image_url(cov_img, media_settings, UPLOAD_DIR)
        is_act = item.get("isActive") if item.get("isActive") is not None else item.get("is_active")
        if is_act is None:
            is_act = True
        db.add(
            Service(
                id=srv_id,
                title=str(item.get("title", "Prestation")),
                category=str(item.get("category", "Mariage")),
                price=safe_float(item.get("price"), 500.0),
                deposit_percentage=safe_int(dep_pct, 30),
                duration_minutes=safe_int(dur_min, 120),
                photos_count=safe_int(pts_cnt, 20),
                cover_image=cov_img,
                is_active=bool(is_act),
                service_kind=_service_kind_from_item(item),
            )
        )
        count += 1
    return count


def _restore_galleries_from_backup(db: Session, items: List[Dict[str, Any]], media_settings: Dict[str, Any]) -> int:
    db.query(Gallery).delete()
    count = 0
    for item in items:
        if not isinstance(item, dict):
            continue
        g_id = str(item.get("id", f"gal-{uuid.uuid4()}"))
        cover_url = maybe_process_image_url(item.get("coverUrl"), media_settings, UPLOAD_DIR)
        photos = item.get("photos", []) or []
        processed_photos = []
        for photo in photos:
            if isinstance(photo, dict):
                p = dict(photo)
                p["url"] = maybe_process_image_url(p.get("url"), media_settings, UPLOAD_DIR)
                resolved = resolve_photo_thumb_url(p.get("url"), p.get("thumbUrl"), UPLOAD_DIR)
                if resolved:
                    p["thumbUrl"] = resolved
                if p.get("url") and not p.get("hdUrl"):
                    p["hdUrl"] = p["url"]
                if p.get("url") and str(p.get("url")).startswith("/uploads/") and p.get("watermarked") is None:
                    p["watermarked"] = True
                processed_photos.append(p)
            else:
                processed_photos.append(photo)
        db.add(
            Gallery(
                id=g_id,
                title=str(item.get("title", "Galerie")),
                client_name=str(item.get("clientName", "Client")),
                client_email=item.get("clientEmail"),
                category=str(item.get("category", "mariage")),
                is_private=bool(item.get("isPrivate", False)),
                access_key=str(item.get("accessKey", "KEY")),
                password=prepare_gallery_password_for_storage(item.get("password")),
                expires_at=item.get("expiresAt"),
                cover_url=cover_url,
                albums=item.get("albums", []),
                photos=processed_photos,
                booking_id=item.get("bookingId"),
                deleted_at=item.get("deletedAt"),
            )
        )
        count += 1
    return count


def _restore_testimonials_from_backup(db: Session, items: List[Dict[str, Any]]) -> int:
    db.query(Testimonial).delete()
    count = 0
    for item in items:
        if not isinstance(item, dict):
            continue
        db.add(
            Testimonial(
                id=str(item.get("id") or uuid.uuid4()),
                client_name=str(item.get("clientName") or item.get("client_name") or "Client"),
                client_role=str(item.get("clientRole") or item.get("client_role") or "Client Studio"),
                rating=safe_int(item.get("rating"), 5),
                content=str(item.get("content", "")),
                avatar_url=item.get("avatarUrl") or item.get("avatar_url"),
                is_published=bool(
                    item.get("isPublished")
                    if item.get("isPublished") is not None
                    else item.get("is_published", False)
                ),
            )
        )
        count += 1
    return count


def _restore_admin_backup(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
    settings_data = data.get("settings") or {}
    if not isinstance(settings_data, dict):
        settings_data = {}

    has_payload = any(
        data.get(key) is not None
        for key in (
            "settings",
            "bookings",
            "contactMessages",
            "blogPosts",
            "galleries",
            "services",
            "testimonials",
            "faqItems",
        )
    )
    if not has_payload:
        raise ValueError("Fichier de sauvegarde vide ou invalide.")

    media_settings = load_media_settings(db)
    restored: Dict[str, int] = {}

    if settings_data:
        restored_settings = 0
        for key, value in settings_data.items():
            if key in BACKUP_SKIP_SETTINGS_KEYS:
                continue
            if key in BACKUP_SECRET_KEYS and (value == "[redacted]" or value is None or value == ""):
                continue
            _upsert_setting_value(db, key, value)
            restored_settings += 1
        restored["settings"] = restored_settings
        db.flush()
        media_settings = load_media_settings(db)

    bookings = data.get("bookings")
    if bookings is None and isinstance(settings_data.get(BOOKINGS_KEY), list):
        bookings = settings_data[BOOKINGS_KEY]
    if bookings is not None:
        _save_json_setting_list(db, BOOKINGS_KEY, bookings, commit=False)
        restored["bookings"] = len(bookings)

    contact_messages = data.get("contactMessages")
    if contact_messages is None and isinstance(settings_data.get(CONTACT_MESSAGES_KEY), list):
        contact_messages = settings_data[CONTACT_MESSAGES_KEY]
    if contact_messages is not None:
        _save_json_setting_list(db, CONTACT_MESSAGES_KEY, contact_messages, commit=False)
        restored["contactMessages"] = len(contact_messages)

    faq_items = data.get("faqItems")
    if faq_items is None and isinstance(settings_data.get(FAQ_ITEMS_KEY), list):
        faq_items = settings_data[FAQ_ITEMS_KEY]
    if faq_items is not None:
        _save_json_setting_list(db, FAQ_ITEMS_KEY, faq_items, commit=False)
        restored["faqItems"] = len(faq_items)

    blog_posts = data.get("blogPosts")
    if blog_posts is None and isinstance(settings_data.get(BLOG_POSTS_KEY), list):
        blog_posts = settings_data[BLOG_POSTS_KEY]
    if blog_posts is not None:
        _upsert_setting_value(db, BLOG_POSTS_KEY, blog_posts)
        restored["blogPosts"] = len(blog_posts)

    if data.get("services") is not None:
        restored["services"] = _restore_services_from_backup(db, data["services"], media_settings)

    if data.get("galleries") is not None:
        restored["galleries"] = _restore_galleries_from_backup(db, data["galleries"], media_settings)

    if data.get("testimonials") is not None:
        restored["testimonials"] = _restore_testimonials_from_backup(db, data["testimonials"])

    db.commit()
    return restored


@app.post("/api/v1/admin/backup/restore")
def admin_restore_backup(
    payload: BackupRestorePayload,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_super_admin),
):
    if not payload.confirm:
        return {
            "status": "error",
            "message": "Confirmez la restauration en envoyant confirm: true.",
        }
    try:
        restored = _restore_admin_backup(db, payload.model_dump(exclude_none=False))
        exported_at = (payload.meta or {}).get("exportedAt") or payload.model_dump().get("exportedAt")
        return {
            "status": "success",
            "message": "Sauvegarde restaurée avec succès en base PostgreSQL.",
            "restored": restored,
            "exportedAt": exported_at,
        }
    except Exception as exc:
        db.rollback()
        print(f"Erreur restore_backup: {exc}")
        raise HTTPException(status_code=500, detail="Échec de la restauration de la sauvegarde.")


@app.get("/api/v1/client/notifications")
def client_list_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = build_client_notifications(db, current_user.email)
    unread = sum(1 for n in items if not n.get("read"))
    return {"data": items, "unreadCount": unread}


@app.post("/api/v1/client/notifications/mark-read")
def client_mark_notifications_read(
    payload: ClientNotificationMarkRead,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    mark_client_notifications_read(
        db,
        current_user.email,
        payload.ids,
        bool(payload.all),
    )
    return {"status": "success"}

@app.post("/api/v1/testimonials")
def create_testimonial(req: TestimonialCreate, request: Request, db: Session = Depends(get_db)):
    check_rate_limit(f"testimonial:{extract_client_ip(request)}", max_attempts=3, window_seconds=3600)
    t = Testimonial(
        id=str(uuid.uuid4()),
        client_name=req.client_name.strip(),
        client_role=(req.client_role or "Client Studio").strip(),
        rating=safe_int(req.rating, 5),
        content=req.content.strip(),
        avatar_url=req.avatar_url,
        is_published=False,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return {"message": "Avis envoyé pour modération", "data": _testimonial_to_dict(t)}

@app.patch("/api/v1/admin/testimonials/{id}/toggle-approve")
def toggle_approve_testimonial(id: str, db: Session = Depends(get_db), _admin: User = Depends(require_admin_user)):
    t = db.query(Testimonial).filter(Testimonial.id == id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Avis introuvable")
    t.is_published = not t.is_published
    db.commit()
    return {"message": "Statut de modération mis à jour", "is_published": t.is_published}

# -------------------------------------------------------------------
# Galleries & Photos Endpoints (Persisted in PostgreSQL)
# -------------------------------------------------------------------
def _normalize_client_email(email: str) -> str:
    email_clean = (email or "").lower().strip()
    if is_development() and email_clean == "client@kswstudio.fr":
        return "sophie.d@email.com"
    return email_clean


def _require_client_user(user: User) -> None:
    if (user.role or "client") != "client":
        raise HTTPException(status_code=403, detail="Accès réservé aux clients.")


def _get_client_bookings(db: Session, email: str) -> List[Dict[str, Any]]:
    email_clean = _normalize_client_email(email)
    matched: List[Dict[str, Any]] = []
    for b in _get_json_setting_list(db, BOOKINGS_KEY):
        if _normalize_client_email(str(b.get("email", ""))) != email_clean:
            continue
        matched.append(b)
    matched.sort(key=lambda x: str(x.get("createdAt") or ""), reverse=True)
    return matched


def _booking_to_client_invoice(booking: Dict[str, Any], default_currency: str) -> Dict[str, Any]:
    return booking_to_invoice(booking, default_currency)


@app.get("/api/v1/client/bookings")
def client_list_bookings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_client_user(current_user)
    return {"data": _get_client_bookings(db, current_user.email)}


@app.get("/api/v1/client/invoices")
def client_list_invoices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_client_user(current_user)
    studio_currency = _get_studio_currency(db)
    bookings = _get_client_bookings(db, current_user.email)
    invoices = [_booking_to_client_invoice(b, studio_currency) for b in bookings]
    total_invoiced = sum(i["totalAmount"] for i in invoices)
    total_paid = sum(i["paidAmount"] for i in invoices)
    return {
        "data": invoices,
        "summary": {
            "totalInvoiced": total_invoiced,
            "totalPaid": total_paid,
            "remaining": max(0.0, total_invoiced - total_paid),
        },
    }


@app.post("/api/v1/client/profile/password")
def client_change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
    _change_user_password(user, payload.current_password, payload.new_password, db)
    return {"status": "success", "message": "Mot de passe mis à jour."}


def _enrich_photos_with_thumbs(photos: list) -> list:
    if not isinstance(photos, list):
        return photos
    enriched = []
    for photo in photos:
        if not isinstance(photo, dict):
            enriched.append(photo)
            continue
        p = dict(photo)
        resolved = resolve_photo_thumb_url(p.get("url"), p.get("thumbUrl"), UPLOAD_DIR)
        if resolved:
            p["thumbUrl"] = resolved
        if p.get("url") and not p.get("hdUrl"):
            p["hdUrl"] = p["url"]
        if not p.get("originalUrl") and p.get("url"):
            inferred = infer_original_url_from_hd(str(p.get("url")), UPLOAD_DIR)
            if inferred:
                p["originalUrl"] = inferred
        enriched.append(p)
    return enriched


def _bg_generate_missing_thumbs(photos: list) -> None:
    if not isinstance(photos, list):
        return
    seen: set[str] = set()
    for photo in photos:
        if not isinstance(photo, dict):
            continue
        url = str(photo.get("url") or "")
        if not url.startswith("/uploads/") or url in seen:
            continue
        seen.add(url)
        try:
            ensure_thumbnail_file(url, UPLOAD_DIR)
        except Exception as exc:
            print(f"BG thumb error {url}: {exc}")


def _gallery_to_dict(
    g,
    include_password: bool = False,
    *,
    include_media: bool = True,
    plain_password_override: Optional[str] = None,
) -> dict:
    data = {
        "id": g.id,
        "title": g.title,
        "clientName": g.client_name,
        "clientEmail": g.client_email,
        "category": g.category,
        "isPrivate": g.is_private,
        "accessKey": g.access_key,
        "expiresAt": g.expires_at,
        "coverUrl": g.cover_url,
        "bookingId": getattr(g, "booking_id", None),
        "deletedAt": getattr(g, "deleted_at", None),
    }
    if include_media:
        data["albums"] = g.albums or []
        data["photos"] = _enrich_photos_with_thumbs(g.photos or [])
    else:
        data["albums"] = []
        data["photos"] = []
        photos = g.photos or []
        albums = g.albums or []
        data["photosCount"] = len(photos) if isinstance(photos, list) else 0
        data["albumsCount"] = len(albums) if isinstance(albums, list) else 0
    if include_password:
        if plain_password_override:
            data["password"] = plain_password_override
            data["hasPassword"] = True
        elif g.password and is_stored_password_hash(g.password):
            data["password"] = ""
            data["hasPassword"] = True
        else:
            data["password"] = g.password
            data["hasPassword"] = bool(g.password)
    return data


def _get_gallery_by_access_key(db: Session, access_key: str) -> Gallery:
    key = (access_key or "").strip().upper()
    if not key:
        raise HTTPException(status_code=400, detail="Clé d'accès requise")
    gallery = db.query(Gallery).filter(Gallery.access_key.ilike(key)).first()
    if not gallery:
        raise HTTPException(status_code=404, detail="Clé d'accès invalide ou galerie introuvable.")
    if getattr(gallery, "deleted_at", None):
        raise HTTPException(status_code=404, detail="Cette galerie n'est plus disponible.")
    return gallery


def _assert_gallery_unlocked(gallery: Gallery, password: Optional[str] = None) -> None:
    if gallery.password and not verify_gallery_password(gallery.password, password):
        raise HTTPException(status_code=403, detail="Mot de passe incorrect.")
    if gallery.expires_at:
        try:
            from datetime import date
            exp = date.fromisoformat(str(gallery.expires_at)[:10])
            if exp < date.today():
                raise HTTPException(status_code=410, detail="Cette galerie a expiré. Contactez le studio.")
        except ValueError:
            pass


def _photo_local_path(url: str) -> Optional[str]:
    if not url:
        return None
    return get_media_storage(UPLOAD_DIR).local_path(str(url).strip())


def _guess_image_ext(url: str, default: str = ".jpg") -> str:
    lower = str(url or "").lower()
    for ext in (".webp", ".jpeg", ".jpg", ".png", ".gif"):
        if ext in lower:
            return ext if ext != ".jpeg" else ".jpg"
    return default


def _read_photo_bytes_for_zip(
    url: str,
    photo: Optional[dict] = None,
    *,
    media_settings: Optional[dict] = None,
) -> Optional[tuple]:
    """Lit un fichier local, Supabase Storage ou URL externe ; applique le filigrane si nécessaire."""
    storage = get_media_storage(UPLOAD_DIR)
    data: Optional[bytes] = storage.get_bytes(url)
    ext = ".jpg"

    if data:
        local = _photo_local_path(url)
        ext = _guess_image_ext(local or url, os.path.splitext(local or url)[1] or ".webp")
    else:
        raw = str(url or "").strip()
        if not raw.startswith(("http://", "https://")):
            return None
        try:
            from urllib.request import Request, urlopen

            req = Request(raw, headers={"User-Agent": "KSWStudio-GalleryZip/1.0"})
            with urlopen(req, timeout=45) as resp:
                data = resp.read()
            if not data:
                return None
            content_type = (resp.headers.get("Content-Type") or "").lower()
            if "webp" in content_type:
                ext = ".webp"
            elif "png" in content_type:
                ext = ".png"
            else:
                ext = _guess_image_ext(raw)
        except Exception as exc:
            print(f"ZIP fetch error {url}: {exc}")
            return None

    if not data:
        return None

    media = normalize_media_settings(media_settings) if media_settings else {}
    source_for_wm = delivery_source_url(photo) if photo else url

    if media and should_apply_watermark_at_delivery(photo, source_for_wm):
        try:
            data = apply_watermark_to_bytes(data, media, UPLOAD_DIR)
            ext = ".webp"
        except Exception as exc:
            print(f"Watermark delivery error {url}: {exc}")

    return data, ext


def _safe_zip_name(title: str, index: int) -> str:
    base = re.sub(r"[^\w.\-]+", "_", (title or f"photo_{index}").strip()) or f"photo_{index}"
    if not base.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
        base = f"{base}.jpg"
    return base


@app.post("/api/v1/galleries/unlock")
def unlock_gallery(req: GalleryUnlockRequest, request: Request, db: Session = Depends(get_db)):
    ip = extract_client_ip(request)
    key = (req.access_key or "").strip().lower()
    check_rate_limit(f"gallery-unlock:{ip}:{key}", max_attempts=8, window_seconds=900)
    gallery = _get_gallery_by_access_key(db, req.access_key)
    _assert_gallery_unlocked(gallery, req.password)
    return {"status": "success", "data": _gallery_to_dict(gallery)}


@app.post("/api/v1/galleries/download-zip")
def download_gallery_zip(req: GalleryDownloadZipRequest, request: Request, db: Session = Depends(get_db)):
    ip = extract_client_ip(request)
    check_rate_limit(f"gallery-dl:{ip}:{(req.access_key or '').strip().lower()}", max_attempts=15, window_seconds=3600)
    gallery = _get_gallery_by_access_key(db, req.access_key)
    _assert_gallery_unlocked(gallery, req.password)
    media_settings = load_media_settings(db)

    photos = gallery.photos or []
    if not isinstance(photos, list):
        photos = []

    active_photos = [p for p in photos if isinstance(p, dict) and not p.get("deletedAt")]
    if req.photo_ids:
        wanted = {str(pid) for pid in req.photo_ids}
        active_photos = [p for p in active_photos if str(p.get("id")) in wanted]
    elif req.favorites_only:
        active_photos = [p for p in active_photos if p.get("isFavorite")]
    elif req.album_id and req.album_id not in ("all", "fav"):
        active_photos = [p for p in active_photos if str(p.get("albumId") or "") == req.album_id]

    buffer = io.BytesIO()
    added = 0
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for index, photo in enumerate(active_photos, start=1):
            url = delivery_source_url(photo)
            payload = _read_photo_bytes_for_zip(url, photo, media_settings=media_settings)
            if not payload:
                continue
            data, ext = payload
            arcname = _safe_zip_name(str(photo.get("title") or ""), index)
            if not arcname.lower().endswith((".jpg", ".jpeg", ".png", ".webp", ".gif")):
                arcname = f"{os.path.splitext(arcname)[0]}{ext}"
            zf.writestr(arcname, data)
            added += 1

    if added == 0:
        raise HTTPException(status_code=404, detail="Aucune photo téléchargeable trouvée pour cette sélection.")

    buffer.seek(0)
    filename = f"{gallery.access_key or 'galerie'}-photos.zip"
    return StreamingResponse(
        buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.post("/api/v1/galleries/download-photo")
def download_gallery_photo(req: GalleryDownloadPhotoRequest, request: Request, db: Session = Depends(get_db)):
    ip = extract_client_ip(request)
    key = (req.access_key or "").strip().lower()
    check_rate_limit(f"gallery-dl-photo:{ip}:{key}", max_attempts=8, window_seconds=900)
    gallery = _get_gallery_by_access_key(db, req.access_key)
    _assert_gallery_unlocked(gallery, req.password)
    media_settings = load_media_settings(db)

    photos = gallery.photos or []
    if not isinstance(photos, list):
        photos = []

    photo = next(
        (p for p in photos if isinstance(p, dict) and str(p.get("id")) == str(req.photo_id)),
        None,
    )
    if not photo:
        raise HTTPException(status_code=404, detail="Photo introuvable dans cette galerie.")

    url = delivery_source_url(photo)
    payload = _read_photo_bytes_for_zip(url, photo, media_settings=media_settings)
    if not payload:
        raise HTTPException(status_code=404, detail="Impossible de préparer cette photo.")

    data, ext = payload
    title = _safe_zip_name(str(photo.get("title") or "photo"), 1)
    if not title.lower().endswith((".jpg", ".jpeg", ".png", ".webp", ".gif")):
        title = f"{os.path.splitext(title)[0]}{ext}"

    media_type = "image/webp" if ext == ".webp" else "image/jpeg"
    return StreamingResponse(
        io.BytesIO(data),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{title}"'},
    )


@app.get("/api/v1/client/galleries")
def list_client_galleries(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_client_user(current_user)

    email_clean = _normalize_client_email(current_user.email)
    if not email_clean:
        return {"data": []}

    galleries_db = (
        db.query(Gallery)
        .filter(
            Gallery.is_private == True,
            func.lower(func.coalesce(Gallery.client_email, "")) == email_clean,
            Gallery.deleted_at.is_(None),
        )
        .all()
    )
    matched = [_gallery_to_dict(g, include_media=False) for g in galleries_db]

    return {"data": matched}


@app.get("/api/v1/galleries/public")
def list_public_galleries(db: Session = Depends(get_db)):
    galleries_db = (
        db.query(Gallery)
        .filter(Gallery.is_private == False, Gallery.deleted_at.is_(None))
        .all()
    )
    return {"data": [_gallery_to_dict(g, include_password=False) for g in galleries_db]}

@app.get("/api/v1/admin/galleries")
def admin_list_galleries(db: Session = Depends(get_db), _admin: User = Depends(require_admin_user)):
    galleries_db = db.query(Gallery).all()
    return {"data": [_gallery_to_dict(g, include_password=True) for g in galleries_db]}


@app.post("/api/v1/admin/galleries/generate-thumbnails")
def admin_generate_gallery_thumbnails(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin_user),
):
    stats = generate_all_gallery_thumbnails(db, UPLOAD_DIR, dry_run=False)
    return {
        "status": "success",
        "message": f"{stats['generated']} miniature(s) générée(s), {stats['updatedGalleries']} galerie(s) mise(s) à jour.",
        "stats": stats,
    }


@app.get("/api/v1/galleries")
def list_galleries(db: Session = Depends(get_db)):
    return list_public_galleries(db)

@app.post("/api/v1/admin/galleries/save-all")
def save_all_galleries(
    payload: GalleriesSaveAll,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin_user),
):
    media_settings = load_media_settings(db)
    old_galleries = db.query(Gallery).all()
    old_by_id = {str(g.id): g for g in old_galleries}
    incoming = [dict(item) if not isinstance(item, dict) else item for item in payload.galleries]
    photo_upload_events = detect_gallery_photo_uploads(old_galleries, incoming)

    db.query(Gallery).delete()
    for item in payload.galleries:
        cover_url = maybe_process_image_url(item.get("coverUrl"), media_settings, UPLOAD_DIR)
        photos = item.get("photos", []) or []
        processed_photos = []
        for photo in photos:
            if isinstance(photo, dict):
                p = dict(photo)
                p["url"] = maybe_process_image_url(p.get("url"), media_settings, UPLOAD_DIR)
                resolved = resolve_photo_thumb_url(p.get("url"), p.get("thumbUrl"), UPLOAD_DIR)
                if resolved:
                    p["thumbUrl"] = resolved
                if p.get("url") and not p.get("hdUrl"):
                    p["hdUrl"] = p["url"]
                if p.get("url") and str(p.get("url")).startswith("/uploads/") and p.get("watermarked") is None:
                    p["watermarked"] = True
                processed_photos.append(p)
            else:
                processed_photos.append(photo)

        g_id = str(item.get("id"))
        previous = old_by_id.get(g_id)
        stored_password = prepare_gallery_password_for_storage(
            item.get("password"),
            existing=previous.password if previous else None,
        )

        g = Gallery(
            id=g_id,
            title=item.get("title", "Galerie Studio"),
            client_name=item.get("clientName", "Client"),
            client_email=item.get("clientEmail"),
            category=item.get("category", "mariage"),
            is_private=item.get("isPrivate", True),
            access_key=item.get("accessKey", "STUDIO-KEY"),
            password=stored_password,
            booking_id=item.get("bookingId"),
            expires_at=item.get("expiresAt"),
            deleted_at=item.get("deletedAt"),
            cover_url=cover_url,
            albums=item.get("albums", []),
            photos=processed_photos,
        )
        db.add(g)
    db.commit()

    for event in photo_upload_events:
        background_tasks.add_task(_bg_notify_gallery_photos, event)

    all_photos: list = []
    for item in incoming:
        all_photos.extend(item.get("photos") or [])
    background_tasks.add_task(_bg_generate_missing_thumbs, all_photos)

    return {"message": "Galeries et photos enregistrées et persistées en BDD PostgreSQL", "count": len(payload.galleries)}
