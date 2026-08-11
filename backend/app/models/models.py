import uuid
from sqlalchemy import Column, String, Text, Boolean, Integer, Float, DateTime, JSON, Index
from datetime import datetime
from app.db.session import Base

class Setting(Base):
    __tablename__ = "settings"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    key = Column(String, unique=True, index=True, nullable=False)
    value = Column(Text, nullable=True)
    group = Column(String, default="general")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=True)
    role = Column(String, default="client") # admin, photographer, client
    status = Column(String, default="active") # active, pending, suspended
    is_superuser = Column(Boolean, default=False)
    phone = Column(String, nullable=True)
    avatar_url = Column(Text, nullable=True)
    last_login_at = Column(DateTime, nullable=True)
    last_seen_at = Column(DateTime, nullable=True)
    last_login_ip = Column(String, nullable=True)
    last_login_city = Column(String, nullable=True)
    last_login_country = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    @property
    def name(self):
        return f"{self.first_name or ''} {self.last_name or ''}".strip() or "Photographe Master"

class Service(Base):
    __tablename__ = "services"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    category = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    deposit_percentage = Column(Integer, default=30)
    duration_minutes = Column(Integer, default=120)
    photos_count = Column(Integer, default=20)
    cover_image = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    service_kind = Column(String, default="photo", nullable=False)
    seo_title = Column(String, nullable=True)
    seo_description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Testimonial(Base):
    __tablename__ = "testimonials"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    client_name = Column(String, nullable=False)
    client_role = Column(String, default="Client Studio")
    rating = Column(Integer, default=5)
    content = Column(Text, nullable=False)
    avatar_url = Column(Text, nullable=True)
    is_published = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Gallery(Base):
    __tablename__ = "galleries"
    __table_args__ = (
        Index("ix_galleries_private_email", "is_private", "client_email"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    client_name = Column(String, nullable=False)
    client_email = Column(String, nullable=True, index=True)
    category = Column(String, default="mariage")
    is_private = Column(Boolean, default=True)
    access_key = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=True)
    booking_id = Column(String, nullable=True, index=True)
    expires_at = Column(String, nullable=True)
    cover_url = Column(Text, nullable=True)
    albums = Column(JSON, default=list)
    photos = Column(JSON, default=list)
    deleted_at = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ElectronicInvitation(Base):
    """Demande et invitation électronique liée à un client."""

    __tablename__ = "electronic_invitations"
    __table_args__ = (
        Index("ix_invitations_client_email", "client_email"),
        Index("ix_invitations_status", "status"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    client_user_id = Column(String, nullable=True, index=True)
    client_email = Column(String, nullable=False, index=True)
    client_name = Column(String, nullable=False)
    event_type = Column(String, nullable=False, default="mariage")
    status = Column(String, nullable=False, default="pending")
    rejection_reason = Column(Text, nullable=True)
    organizer_names = Column(String, nullable=False)
    event_date = Column(String, nullable=False)
    event_time = Column(String, nullable=True)
    venue = Column(String, nullable=True)
    address = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    contact = Column(String, nullable=True)
    cover_url = Column(Text, nullable=True)
    logo_url = Column(Text, nullable=True)
    gallery_urls = Column(JSON, default=list)
    dress_code = Column(String, nullable=True)
    program = Column(JSON, default=list)
    extra_info = Column(Text, nullable=True)
    map_lat = Column(Float, nullable=True)
    map_lng = Column(Float, nullable=True)
    template_key = Column(String, default="elegant")
    customization = Column(JSON, default=dict)
    public_token = Column(String, unique=True, index=True, nullable=True)
    link_active = Column(Boolean, default=False)
    link_active_from = Column(String, nullable=True)
    link_active_until = Column(String, nullable=True)
    phone_required = Column(Boolean, default=False)
    deleted_at = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class InvitationGuest(Base):
    """Réponse RSVP d'un invité."""

    __tablename__ = "invitation_guests"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    invitation_id = Column(String, nullable=False, index=True)
    full_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    response = Column(String, nullable=False, default="maybe")
    guest_count = Column(Integer, default=1)
    companions = Column(JSON, default=list)
    message = Column(Text, nullable=True)
    preferences = Column(JSON, default=dict)
    source = Column(String, default="public_form")
    check_in_token = Column(String, nullable=True, unique=True, index=True)
    checked_in_at = Column(DateTime, nullable=True)
    responded_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
