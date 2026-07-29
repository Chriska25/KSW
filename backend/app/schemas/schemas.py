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

class SyncFromLocalPayload(BaseModel):
    settings: Optional[Dict[str, Any]] = None
    services: Optional[List[Dict[str, Any]]] = None
    testimonials: Optional[List[Dict[str, Any]]] = None
    galleries: Optional[List[Dict[str, Any]]] = None
    blog_posts: Optional[List[Dict[str, Any]]] = None

class GalleryUnlockRequest(BaseModel):
    access_key: str
    password: Optional[str] = None

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

class NotificationMarkRead(BaseModel):
    ids: Optional[List[str]] = None
    all: Optional[bool] = False

class ClientNotificationMarkRead(BaseModel):
    ids: Optional[List[str]] = None
    all: Optional[bool] = False

class AdminEmailTest(BaseModel):
    to: Optional[str] = None

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
