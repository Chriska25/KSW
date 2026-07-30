import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

connect_args: dict = {}
if "sqlite" in settings.DATABASE_URL:
    connect_args = {"check_same_thread": False}
elif "postgresql" in settings.DATABASE_URL:
    connect_args = {"connect_timeout": 5}

engine_kwargs: dict = {
    "connect_args": connect_args,
    "pool_pre_ping": True,
    "pool_timeout": 10,
}
if "postgresql" in settings.DATABASE_URL:
    engine_kwargs.update(pool_size=10, max_overflow=20, pool_recycle=3600)

engine = create_engine(settings.DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
