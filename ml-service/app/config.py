from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = BASE_DIR.parent


class Settings(BaseSettings):
    database_url: str = ""
    allowed_origins: str = "http://localhost:3000"
    model_dir: str = "models"
    version: str = "1.0.0"

    model_config = SettingsConfigDict(
        env_file=(
            str(BASE_DIR / ".env"),
            str(BASE_DIR / ".env.local"),
            str(REPO_ROOT / ".env.local"),
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
