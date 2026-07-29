import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "KSW Studio Python FastAPI Backend"
    API_V1_STR: str = "/api/v1"
    
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "ksw_studio")
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: str = os.getenv("DB_PORT", "5432")
    USE_SQLITE: bool = os.getenv("USE_SQLITE", "false").lower() in ("true", "1")

    @property
    def DATABASE_URL(self) -> str:
        if self.USE_SQLITE:
            backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            db_path = os.path.join(backend_dir, "studio_photo.db")
            return f"sqlite:///{db_path}"
        user_pass = f"{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@" if self.POSTGRES_USER else ""
        return f"postgresql://{user_pass}{self.DB_HOST}:{self.DB_PORT}/{self.POSTGRES_DB}"

settings = Settings()
