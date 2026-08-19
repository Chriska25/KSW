from urllib.parse import parse_qs, urlparse

import psycopg2
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings


def _parse_db_url(db_url: str):
    normalized = db_url.replace("postgresql+psycopg2://", "postgresql://", 1)
    parsed = urlparse(normalized)
    query = parse_qs(parsed.query)
    sslmode = (query.get("sslmode") or [None])[0] or settings.DB_SSLMODE
    dbname = (parsed.path or "/postgres").lstrip("/") or "postgres"
    return parsed, query, sslmode, dbname


def _create_engine():
    db_url = settings.database_url

    if "sqlite" in db_url:
        return create_engine(
            db_url,
            connect_args={"check_same_thread": False},
            pool_pre_ping=True,
            pool_timeout=10,
        )

    if "postgresql" not in db_url:
        return create_engine(db_url, pool_pre_ping=True, pool_timeout=10)

    parsed, _query, sslmode, dbname = _parse_db_url(db_url)
    port = parsed.port or 5432
    is_supabase_pooler = bool(parsed.hostname and "pooler.supabase.com" in parsed.hostname)

    connect_args: dict = {
        "connect_timeout": 10,
        "options": "-c search_path=public",
    }
    if sslmode:
        connect_args["sslmode"] = sslmode

    # Pooler transaction (6543) : éviter les prepared statements côté SQLAlchemy
    engine_kwargs: dict = {
        "connect_args": connect_args,
        "pool_pre_ping": True,
        "pool_timeout": 10,
        "pool_size": 5,
        "max_overflow": 10,
        "pool_recycle": 300 if port == 6543 else 3600,
    }
    if port == 6543:
        engine_kwargs["execution_options"] = {"compiled_cache": {}}

    if is_supabase_pooler and parsed.username:
        # URL.create + creator : psycopg2/libpq tronque parfois postgres.[ref] dans l'URI
        sa_url = URL.create(
            drivername="postgresql+psycopg2",
            username=parsed.username,
            password=parsed.password or "",
            host=parsed.hostname or "",
            port=port,
            database=dbname,
        )
        username = parsed.username
        password = parsed.password or ""

        def _connect():
            return psycopg2.connect(
                user=username,
                password=password,
                host=parsed.hostname,
                port=port,
                dbname=dbname,
                connect_timeout=10,
                options="-c search_path=public",
                sslmode=sslmode or "require",
            )

        return create_engine(sa_url, creator=_connect, **engine_kwargs)

    sa_url = URL.create(
        drivername="postgresql+psycopg2",
        username=parsed.username or "",
        password=parsed.password or "",
        host=parsed.hostname or "",
        port=port,
        database=dbname,
        query={"sslmode": sslmode} if sslmode else {},
    )
    return create_engine(sa_url, **engine_kwargs)


engine = _create_engine()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db_connection() -> bool:
    """Test rapide de connexion (health check)."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
