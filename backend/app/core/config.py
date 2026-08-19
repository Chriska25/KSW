import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "KSW Studio Python FastAPI Backend"
    API_V1_STR: str = "/api/v1"

    # Connection string complète (prioritaire) — ex. Supabase :
    # postgresql://postgres.[ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    DB_SSLMODE: str = os.getenv("DB_SSLMODE", "require")

    # Supabase Storage (photos / médias)
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_STORAGE_BUCKET: str = os.getenv("SUPABASE_STORAGE_BUCKET", "gallery-media")
    STORAGE_BACKEND: str = os.getenv("STORAGE_BACKEND", "local")  # local | supabase
    STORAGE_LOCAL_MIRROR: bool = os.getenv("STORAGE_LOCAL_MIRROR", "false").lower() in ("true", "1")

    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "ksw_studio")
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: str = os.getenv("DB_PORT", "5432")
    USE_SQLITE: bool = os.getenv("USE_SQLITE", "false").lower() in ("true", "1")

    @property
    def database_url(self) -> str:
        if self.DATABASE_URL.strip():
            return self.DATABASE_URL.strip()
        if self.USE_SQLITE:
            backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            db_path = os.path.join(backend_dir, "studio_photo.db")
            return f"sqlite:///{db_path}"
        user_pass = f"{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@" if self.POSTGRES_USER else ""
        return f"postgresql://{user_pass}{self.DB_HOST}:{self.DB_PORT}/{self.POSTGRES_DB}"


settings = Settings()
