import uuid
from sqlalchemy import Column, String, Text, Boolean, Integer, Float, DateTime, JSON
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
    is_active = Column(Boolean, default=True)
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
    is_published = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Gallery(Base):
    __tablename__ = "galleries"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    client_name = Column(String, nullable=False)
    client_email = Column(String, nullable=True)
    category = Column(String, default="mariage")
    is_private = Column(Boolean, default=True)
    access_key = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=True)
    expires_at = Column(String, nullable=True)
    cover_url = Column(Text, nullable=True)
    albums = Column(JSON, default=list)
    photos = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
