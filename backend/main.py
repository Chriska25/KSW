import os
import json
import uuid
import shutil
# pyrefly: ignore [missing-import]
from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, Request, BackgroundTasks
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from fastapi.staticfiles import StaticFiles
# pyrefly: ignore [missing-import]
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional

from database import engine, Base, get_db, SessionLocal
from models import Setting, User, Service, Testimonial, Gallery
from schemas import SettingUpdate, LoginRequest, Verify2FARequest, RegisterRequest, ForgotPasswordRequest, ResetPasswordRequest, ServiceCreate, TestimonialCreate, GalleriesSaveAll, TestimonialsSaveAll, BlogPostsSaveAll, SyncFromLocalPayload, GalleryUnlockRequest, ContactCreate, BookingCreate, BookingStatusUpdate, BookingUpdate, StripeCheckoutCreate, NotificationMarkRead, ClientNotificationMarkRead, AdminEmailTest
from seed import seed_database, ensure_demo_gallery, ensure_blog_posts, hash_password
from auth import (
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
)
from image_processor import (
    load_media_settings,
    process_image_bytes,
    process_base64_data_url,
    maybe_process_image_url,
    is_image_upload,
)
from email_service import notify_contact_received, notify_booking_created, notify_payment_received, send_test_email, send_password_reset_email, admin_email
from notifications_helpers import build_client_notifications, mark_client_notifications_read

# Ensure uploads directory exists
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
BLOG_POSTS_KEY = "blog_posts"
CONTACT_MESSAGES_KEY = "contact_messages"
BOOKINGS_KEY = "bookings"
NOTIFICATIONS_READ_KEY = "notifications_read_ids"
NOTIFICATIONS_MANUAL_KEY = "admin_notifications_manual"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Auto-create tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="KSW Studio Python FastAPI Backend",
    description="High-performance Python backend for KSW Studio photography platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Serve uploaded static files
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

@app.middleware("http")
async def dynamic_cors_and_cache_middleware(request, call_next):
    origin = request.headers.get("origin")
    
    # Handle OPTIONS preflight requests directly
    if request.method == "OPTIONS":
        headers = {
            "Access-Control-Allow-Origin": origin if origin else "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "*",
            "Cache-Control": "no-cache, no-store, must-revalidate",
        }
        if origin and origin != "*":
            headers["Access-Control-Allow-Credentials"] = "true"
        return JSONResponse(status_code=200, content={"status": "ok"}, headers=headers)

    try:
        response = await call_next(request)
    except Exception as exc:
        print(f"MIDDLEWARE ERROR: {exc}")
        headers = {
            "Access-Control-Allow-Origin": origin if origin else "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "*",
            "Cache-Control": "no-cache, no-store, must-revalidate",
        }
        if origin and origin != "*":
            headers["Access-Control-Allow-Credentials"] = "true"
        return JSONResponse(status_code=200, content={"status": "error", "message": str(exc)}, headers=headers)

    response.headers["Access-Control-Allow-Origin"] = origin if origin else "*"
    if origin and origin != "*":
        response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

@app.post("/api/v1/upload")
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin_user),
):
    content = await file.read()
    media_settings = load_media_settings(db)

    if is_image_upload(file.content_type, file.filename or ""):
        url, size = process_image_bytes(content, media_settings, UPLOAD_DIR)
        return {
            "url": url,
            "filename": os.path.basename(url),
            "size": size,
            "processed": True,
            "format": "webp",
        }

    ext = os.path.splitext(file.filename or "")[1] or ".bin"
    filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as buffer:
        buffer.write(content)

    return {
        "url": f"/uploads/{filename}",
        "filename": filename,
        "size": os.path.getsize(file_path),
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
    db = next(get_db())
    seed_database(db)
    ensure_demo_gallery(db)
    ensure_blog_posts(db)

# -------------------------------------------------------------------
# Health Check Endpoint
# -------------------------------------------------------------------
@app.get("/api/v1/health")
def health_check():
    return {
        "status": "ok",
        "service": "KSW Studio Python FastAPI Backend",
        "version": "1.0.0"
    }

@app.post("/api/v1/admin/purge-reset")
def purge_system_reset(db: Session = Depends(get_db), _admin: User = Depends(require_admin_user)):
    # Delete all stale data to enforce single database source of truth
    db.query(Setting).delete()
    db.query(User).delete()
    db.query(Service).delete()
    db.query(Testimonial).delete()
    db.query(Gallery).delete()
    db.commit()

    # Re-seed single canonical dataset
    seed_database(db)

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
    print(f"CRITICAL API ERROR: {exc}")
    origin = request.headers.get("origin") or "*"
    return JSONResponse(
        status_code=200,
        content={"status": "error", "message": f"Erreur API: {exc}"},
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "*",
        }
    )

@app.post("/api/v1/admin/sync-from-local")
def sync_from_local(payload: SyncFromLocalPayload, db: Session = Depends(get_db), _admin: User = Depends(require_admin_user)):
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
                    is_active=bool(is_act)
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
                    password=item.get("password"),
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
        return {"status": "error", "message": str(e)}

# -------------------------------------------------------------------
# Settings Endpoints (Persisted in PostgreSQL)
# -------------------------------------------------------------------
@app.get("/api/v1/settings")
def get_settings(db: Session = Depends(get_db)):
    settings_db = db.query(Setting).all()
    result = {}
    secret_keys = {"stripeSecretKey", "stripeWebhookSecret", "smtpPassword"}
    for s in settings_db:
        try:
            result[s.key] = json.loads(s.value)
        except Exception:
            result[s.key] = s.value
    for key in secret_keys:
        if key in result:
            result[key] = ""
    return {"data": result}

@app.post("/api/v1/settings")
@app.post("/api/v1/admin/settings")
def update_settings(payload: SettingUpdate, db: Session = Depends(get_db), _admin: User = Depends(require_admin_user)):
    try:
        for k, v in payload.settings.items():
            if v is None:
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
            "data": payload.settings
        }
    except Exception as e:
        db.rollback()
        print(f"Erreur update_settings: {e}")
        return {"status": "error", "message": str(e)}

# -------------------------------------------------------------------
# Auth Endpoints
# -------------------------------------------------------------------
def _normalize_login_email(email: str) -> str:
    email_clean = email.lower().strip()
    if email_clean == "client@kswstudio.fr":
        return "sophie.d@email.com"
    return email_clean


def _staff_requires_2fa(user: User) -> bool:
    return (user.role or "client") in {"admin", "photographer"}


@app.get("/api/v1/auth/me")
def auth_me(current_user: User = Depends(get_current_user)):
    return {"user": serialize_user(current_user)}


@app.post("/api/v1/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    email_clean = _normalize_login_email(req.email)
    user = db.query(User).filter(User.email == email_clean).first()
    hashed = hash_password(req.password)

    if not user or not verify_password(user, req.password, hashed):
        raise HTTPException(status_code=400, detail="Identifiants incorrects.")

    if (user.status or "active") == "pending":
        raise HTTPException(status_code=403, detail="Votre compte client est en attente de validation par l'administrateur.")
    if (user.status or "active") == "suspended":
        raise HTTPException(status_code=403, detail="Ce compte a été temporairement suspendu par l'administration.")

    res_user = serialize_user(user)

    if _staff_requires_2fa(user):
        issue_2fa_code(user.id)
        return {
            "token": create_pre_2fa_token(user),
            "user": res_user,
            "requires_2fa": True,
            "user_id": user.id,
        }

    return {
        "token": create_access_token(user, two_fa_verified=True),
        "user": res_user,
        "requires_2fa": False,
        "user_id": user.id,
    }


@app.post("/api/v1/auth/verify-2fa")
def verify_2fa(req: Verify2FARequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == req.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    if not verify_2fa_code(req.user_id, req.code):
        raise HTTPException(status_code=400, detail="Code 2FA invalide ou expiré.")

    res_user = serialize_user(user)
    return {
        "token": create_access_token(user, two_fa_verified=True),
        "user": res_user,
    }

@app.post("/api/v1/auth/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Un compte existe déjà avec cet email.")
    
    new_user = User(
        first_name=req.first_name,
        last_name=req.last_name,
        email=req.email.lower(),
        password=hash_password(req.password),
        role="client",
        status="active"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "Compte créé avec succès",
        "token": create_access_token(new_user, two_fa_verified=True),
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
def forgot_password(req: ForgotPasswordRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    email_clean = _normalize_login_email(req.email)
    user = db.query(User).filter(User.email == email_clean).first()
    if user:
        token = issue_password_reset_token(user.id)
        background_tasks.add_task(_send_password_reset_email_task, user.email, user.name or user.email, token)
    return {"message": "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé."}


@app.post("/api/v1/auth/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    password = (req.password or "").strip()
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 8 caractères.")

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

@app.get("/api/v1/admin/users")
def list_users(db: Session = Depends(get_db), _admin: User = Depends(require_admin_user)):
    users = db.query(User).all()
    res = []
    for u in users:
        res.append({
            "id": u.id,
            "name": u.name,
            "firstName": u.first_name or "",
            "lastName": u.last_name or "",
            "email": u.email,
            "role": u.role or "admin",
            "status": u.status or "active",
            "createdAt": u.created_at.strftime("%Y-%m-%d") if u.created_at else "2026-07-28"
        })
    return {"data": res}

@app.post("/api/v1/admin/users")
def create_or_update_user(payload: Dict[str, Any], db: Session = Depends(get_db), _admin: User = Depends(require_admin_user)):
    user_id = payload.get("id")
    email = payload.get("email", "").lower().strip()
    first_name = payload.get("firstName", "")
    last_name = payload.get("lastName", "")
    role = payload.get("role", "photographer")
    user_status = payload.get("status", "active")
    password = payload.get("password")

    existing = None
    if user_id:
        existing = db.query(User).filter(User.id == str(user_id)).first()
    if not existing and email:
        existing = db.query(User).filter(User.email == email).first()

    if existing:
        existing.first_name = first_name or existing.first_name
        existing.last_name = last_name or existing.last_name
        existing.role = role
        existing.status = user_status
        if password:
            existing.password = hash_password(password)
        db.commit()
        db.refresh(existing)
        return {"status": "success", "message": "Utilisateur mis à jour", "user": {"id": existing.id, "email": existing.email, "role": existing.role}}
    else:
        new_u = User(
            id=str(user_id or uuid.uuid4()),
            first_name=first_name,
            last_name=last_name,
            email=email,
            password=hash_password(password) if password else hash_password(str(uuid.uuid4())),
            role=role,
            status=user_status
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
    if (user.role or "") == "admin" and user.email == "admin@kswstudio.fr":
        raise HTTPException(status_code=400, detail="Impossible de supprimer le compte administrateur principal.")
    db.delete(user)
    db.commit()
    return {"status": "success", "message": "Utilisateur supprimé."}

# -------------------------------------------------------------------
# Services & Prestations Endpoints
# -------------------------------------------------------------------
@app.get("/api/v1/services")
def list_services(db: Session = Depends(get_db)):
    services = db.query(Service).all()
    res = []
    for srv in services:
        res.append({
            "id": srv.id,
            "title": srv.title,
            "category": srv.category,
            "price": srv.price,
            "depositPercentage": srv.deposit_percentage or 30,
            "durationMinutes": srv.duration_minutes or 120,
            "photosCount": srv.photos_count or 20,
            "coverImage": srv.cover_image,
            "isActive": srv.is_active,
            "seoTitle": srv.seo_title,
            "seoDescription": srv.seo_description
        })
    return {"data": res}

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
    setting = db.query(Setting).filter(Setting.key == key).first()
    if setting and setting.value:
        try:
            parsed = json.loads(setting.value)
            if isinstance(parsed, list):
                return parsed
        except Exception:
            pass
    return []


def _save_json_setting_list(db: Session, key: str, items: List[Dict[str, Any]]) -> None:
    setting = db.query(Setting).filter(Setting.key == key).first()
    val_str = json.dumps(items)
    if setting:
        setting.value = val_str
    else:
        db.add(Setting(key=key, value=val_str, group="crm"))
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


@app.post("/api/v1/contact")
def create_contact_message(
    req: ContactCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
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

@app.post("/api/v1/bookings")
def create_booking(
    req: BookingCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    entry = _append_json_setting(db, BOOKINGS_KEY, {
        "serviceId": req.service_id,
        "serviceTitle": req.service_title,
        "date": req.date,
        "time": req.time,
        "firstName": req.first_name,
        "lastName": req.last_name,
        "email": req.email,
        "phone": req.phone,
        "location": req.location,
        "notes": req.notes,
        "depositAmount": req.deposit_amount,
        "totalPrice": req.total_price,
        "paymentStatus": "unpaid",
        "type": "booking",
    })
    background_tasks.add_task(_bg_notify_booking, dict(entry))
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


@app.post("/api/v1/bookings/stripe/create-checkout-session")
def create_stripe_checkout_session(payload: StripeCheckoutCreate, db: Session = Depends(get_db)):
    import stripe

    items = _get_json_setting_list(db, BOOKINGS_KEY)
    idx = _find_booking_index(items, payload.booking_id)
    if idx < 0:
        raise HTTPException(status_code=404, detail="Réservation introuvable.")

    booking = items[idx]
    deposit = float(booking.get("depositAmount") or 0)
    if deposit <= 0:
        raise HTTPException(status_code=400, detail="Montant d'acompte invalide.")

    stripe.api_key = _load_stripe_secret(db)
    amount_cents = int(round(deposit * 100))

    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": "eur",
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
            success_url=payload.success_url,
            cancel_url=payload.cancel_url,
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
        if webhook_secret:
            event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        elif is_development():
            event = json.loads(payload.decode("utf-8"))
        else:
            raise HTTPException(status_code=503, detail="Webhook Stripe non configuré.")
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

    for b in _get_json_setting_list(db, BOOKINGS_KEY):
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

    for m in _get_json_setting_list(db, CONTACT_MESSAGES_KEY):
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


@app.post("/api/v1/admin/email/test")
def admin_test_email(
    payload: AdminEmailTest,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin_user),
):
    to = (payload.to or admin_email(db)).strip()
    if not to:
        raise HTTPException(status_code=400, detail="Adresse email destinataire requise.")
    ok = send_test_email(db, to)
    if not ok:
        raise HTTPException(
            status_code=503,
            detail="Échec d'envoi. Vérifiez SMTP_HOST, SMTP_USER, SMTP_PASSWORD (ou consultez les logs en dev).",
        )
    return {"status": "success", "message": f"Email de test envoyé à {to}."}


def _admin_search_results(db: Session, query: str) -> List[Dict[str, Any]]:
    q = query.strip().lower()
    if len(q) < 2:
        return []

    results: List[Dict[str, Any]] = []

    for user in db.query(User).all():
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


@app.get("/api/v1/admin/backup/export")
def admin_export_backup(db: Session = Depends(get_db), _admin: User = Depends(require_admin_user)):
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
        users.append(
            {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "status": user.status,
            }
        )

    return {
        "exportedAt": datetime.utcnow().isoformat() + "Z",
        "settings": settings_map,
        "bookings": _get_json_setting_list(db, BOOKINGS_KEY),
        "contactMessages": _get_json_setting_list(db, CONTACT_MESSAGES_KEY),
        "blogPosts": _get_blog_posts_from_db(db),
        "galleries": [_gallery_to_dict(g, include_password=True) for g in db.query(Gallery).all()],
        "users": users,
    }


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
def create_testimonial(req: TestimonialCreate, db: Session = Depends(get_db)):
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
    if email_clean == "client@kswstudio.fr":
        return "sophie.d@email.com"
    return email_clean


def _gallery_to_dict(g, include_password: bool = False) -> dict:
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
        "albums": g.albums or [],
        "photos": g.photos or [],
    }
    if include_password:
        data["password"] = g.password
    return data


@app.post("/api/v1/galleries/unlock")
def unlock_gallery(req: GalleryUnlockRequest, db: Session = Depends(get_db)):
    key = (req.access_key or "").strip().upper()
    if not key:
        raise HTTPException(status_code=400, detail="Clé d'accès requise")

    gallery = db.query(Gallery).filter(Gallery.access_key.ilike(key)).first()
    if not gallery:
        raise HTTPException(status_code=404, detail="Clé d'accès invalide ou galerie introuvable.")

    if gallery.password and gallery.password != (req.password or ""):
        raise HTTPException(status_code=403, detail="Mot de passe incorrect.")

    if gallery.expires_at:
        try:
            from datetime import date
            exp = date.fromisoformat(str(gallery.expires_at)[:10])
            if exp < date.today():
                raise HTTPException(status_code=410, detail="Cette galerie a expiré. Contactez le studio.")
        except ValueError:
            pass

    return {"status": "success", "data": _gallery_to_dict(gallery)}


@app.get("/api/v1/client/galleries")
def list_client_galleries(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    role = current_user.role or "client"
    if role != "client":
        raise HTTPException(status_code=403, detail="Accès réservé aux clients.")

    email_clean = _normalize_client_email(current_user.email)
    if not email_clean:
        return {"data": []}

    galleries_db = db.query(Gallery).filter(Gallery.is_private == True).all()
    matched = []
    for g in galleries_db:
        g_email = (g.client_email or "").lower().strip()
        if g_email and g_email == email_clean:
            matched.append(_gallery_to_dict(g))
            continue
        if g.client_name and email_clean.split("@")[0] in (g.client_name or "").lower():
            matched.append(_gallery_to_dict(g))

    return {"data": matched}


@app.get("/api/v1/galleries/public")
def list_public_galleries(db: Session = Depends(get_db)):
    galleries_db = db.query(Gallery).filter(Gallery.is_private == False).all()
    return {"data": [_gallery_to_dict(g, include_password=False) for g in galleries_db]}

@app.get("/api/v1/admin/galleries")
def admin_list_galleries(db: Session = Depends(get_db), _admin: User = Depends(require_admin_user)):
    galleries_db = db.query(Gallery).all()
    return {"data": [_gallery_to_dict(g, include_password=True) for g in galleries_db]}

@app.get("/api/v1/galleries")
def list_galleries(db: Session = Depends(get_db)):
    return list_public_galleries(db)

@app.post("/api/v1/admin/galleries/save-all")
def save_all_galleries(payload: GalleriesSaveAll, db: Session = Depends(get_db), _admin: User = Depends(require_admin_user)):
    media_settings = load_media_settings(db)
    db.query(Gallery).delete()
    for item in payload.galleries:
        cover_url = maybe_process_image_url(item.get("coverUrl"), media_settings, UPLOAD_DIR)
        photos = item.get("photos", []) or []
        processed_photos = []
        for photo in photos:
            if isinstance(photo, dict):
                p = dict(photo)
                p["url"] = maybe_process_image_url(p.get("url"), media_settings, UPLOAD_DIR)
                processed_photos.append(p)
            else:
                processed_photos.append(photo)

        g = Gallery(
            id=str(item.get("id")),
            title=item.get("title", "Galerie Studio"),
            client_name=item.get("clientName", "Client"),
            client_email=item.get("clientEmail"),
            category=item.get("category", "mariage"),
            is_private=item.get("isPrivate", True),
            access_key=item.get("accessKey", "STUDIO-KEY"),
            password=item.get("password"),
            expires_at=item.get("expiresAt"),
            cover_url=cover_url,
            albums=item.get("albums", []),
            photos=processed_photos,
        )
        db.add(g)
    db.commit()
    return {"message": "Galeries et photos enregistrées et persistées en BDD PostgreSQL", "count": len(payload.galleries)}
