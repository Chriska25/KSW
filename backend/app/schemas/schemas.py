from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class SettingUpdate(BaseModel):
    settings: Dict[str, Any]

class LoginRequest(BaseModel):
    email: str
    password: str

class Verify2FARequest(BaseModel):
    user_id: str
    code: str

class Resend2FARequest(BaseModel):
    user_id: str

class RegisterRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class ProfileUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None

class ServiceCreate(BaseModel):
    title: str
    category: str
    price: float
    deposit_percentage: Optional[int] = 30
    duration_minutes: Optional[int] = 120
    photos_count: Optional[int] = 20
    cover_image: Optional[str] = None
    is_active: Optional[bool] = True

class TestimonialCreate(BaseModel):
    client_name: str
    client_role: Optional[str] = "Client Studio"
    rating: Optional[int] = 5
    content: str
    avatar_url: Optional[str] = None
    is_published: Optional[bool] = False

class GalleriesSaveAll(BaseModel):
    galleries: List[Dict[str, Any]]

class TestimonialsSaveAll(BaseModel):
    testimonials: List[Dict[str, Any]]

class BlogPostsSaveAll(BaseModel):
    posts: List[Dict[str, Any]]

class FaqSaveAll(BaseModel):
    items: List[Dict[str, Any]]

class VisitTrack(BaseModel):
    path: str
    session_id: str
    referrer: Optional[str] = None

class ClientPresenceHeartbeat(BaseModel):
    path: str = "/client/dashboard"
    session_id: Optional[str] = None

class SyncFromLocalPayload(BaseModel):
    settings: Optional[Dict[str, Any]] = None
    services: Optional[List[Dict[str, Any]]] = None
    testimonials: Optional[List[Dict[str, Any]]] = None
    galleries: Optional[List[Dict[str, Any]]] = None
    blog_posts: Optional[List[Dict[str, Any]]] = None


class BackupRestorePayload(BaseModel):
    """Corps d'un export JSON KSW Studio (admin/backup/export)."""
    meta: Optional[Dict[str, Any]] = None
    settings: Optional[Dict[str, Any]] = None
    bookings: Optional[List[Dict[str, Any]]] = None
    contactMessages: Optional[List[Dict[str, Any]]] = None
    blogPosts: Optional[List[Dict[str, Any]]] = None
    galleries: Optional[List[Dict[str, Any]]] = None
    services: Optional[List[Dict[str, Any]]] = None
    testimonials: Optional[List[Dict[str, Any]]] = None
    faqItems: Optional[List[Dict[str, Any]]] = None
    exportedAt: Optional[str] = None
    confirm: bool = False

class GalleryUnlockRequest(BaseModel):
    access_key: str
    password: Optional[str] = None

class GalleryDownloadZipRequest(BaseModel):
    access_key: str
    password: Optional[str] = None
    album_id: Optional[str] = None
    favorites_only: bool = False
    photo_ids: Optional[List[str]] = None

class GalleryDownloadPhotoRequest(BaseModel):
    access_key: str
    password: Optional[str] = None
    photo_id: str

class ContactCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    subject: str
    message: str
    website: Optional[str] = None
    form_started_at: Optional[int] = None

class BookingStatusUpdate(BaseModel):
    status: str

class BookingUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    service_title: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    location: Optional[str] = None
    total_price: Optional[float] = None
    deposit_amount: Optional[float] = None
    status: Optional[str] = None

class StripeCheckoutCreate(BaseModel):
    booking_id: str
    success_url: str
    cancel_url: str

class MobileMoneyPaymentSubmit(BaseModel):
    booking_id: str
    payer_phone: str
    transaction_reference: str

class MobileMoneyConfirm(BaseModel):
    transaction_reference: str

class BalancePaymentRecord(BaseModel):
    amount: float
    payment_method: str
    transaction_reference: Optional[str] = None
    notes: Optional[str] = None

class NotificationMarkRead(BaseModel):
    ids: Optional[List[str]] = None
    all: Optional[bool] = False

class ClientNotificationMarkRead(BaseModel):
    ids: Optional[List[str]] = None
    all: Optional[bool] = False

class AdminEmailTest(BaseModel):
    to: Optional[str] = None
    liveDelivery: Optional[bool] = True
    smtpEnabled: Optional[bool] = None
    smtpHost: Optional[str] = None
    smtpPort: Optional[int] = None
    smtpUser: Optional[str] = None
    smtpPassword: Optional[str] = None
    smtpFrom: Optional[str] = None
    gmailUseApi: Optional[bool] = None

class BookingCreate(BaseModel):
    service_id: str
    service_title: str
    date: str
    time: str
    first_name: str
    last_name: str
    email: str
    phone: str
    location: Optional[str] = None
    notes: Optional[str] = None
    deposit_amount: float
    total_price: float
    preferred_payment_method: Optional[str] = None
