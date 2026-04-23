from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./actitrace.db"
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24

    model_store_dir: Path = Path(__file__).resolve().parent / "models" / "store"
    dataset_path: Path = Path(__file__).resolve().parent.parent.parent / "UCI HAR Dataset"

    cors_origins: str = "http://localhost:3000,http://localhost:5173"

    # Set via env (GROQ_API_KEY). Empty disables the insights endpoint.
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    groq_base_url: str = "https://api.groq.com/openai/v1"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
