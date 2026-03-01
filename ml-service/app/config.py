from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = BASE_DIR.parent


class Settings(BaseSettings):
    database_url: str = ""
    allowed_origins: str = "http://localhost:3000"
    model_dir: str = "models"
    version: str = "1.0.0"
    ml_service_key: str = ""
    ml_service_auth_required: bool = True
    ml_rate_limit_enabled: bool = True
    ml_max_concurrent_infer: int = 2
    ml_disable_heavy_inference: bool = False
    ml_limit_predict_per_hour: int = 40
    ml_limit_skill_gap_per_hour: int = 20
    ml_limit_metadata_per_hour: int = 180
    ml_limit_lookup_per_hour: int = 240
    ml_limit_global_per_hour: int = 400

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
