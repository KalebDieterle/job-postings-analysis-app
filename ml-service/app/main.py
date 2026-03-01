from contextlib import asynccontextmanager
from pathlib import Path

import joblib
import lightgbm as lgb
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.middleware import ml_rate_limit_middleware, ml_service_auth_middleware

# Global model registry loaded once at startup.
model_registry: dict = {}
resolved_model_dir: str = ""


def _resolve_model_dir(model_dir: str) -> Path:
    path = Path(model_dir)
    if path.is_absolute():
        return path

    service_root = Path(__file__).resolve().parents[1]
    cwd_candidate = (Path.cwd() / path).resolve()
    service_candidate = (service_root / path).resolve()

    if cwd_candidate.exists() and any(cwd_candidate.iterdir()):
        return cwd_candidate
    return service_candidate


def _load_models(model_dir: str) -> dict:
    """Load all serialized model artifacts from disk."""
    registry: dict = {}
    base = _resolve_model_dir(model_dir)

    # Salary models
    for name in ("salary_median", "salary_p10", "salary_p90"):
        path = base / f"{name}.lgb"
        if path.exists():
            registry[name] = lgb.Booster(model_file=str(path))

    # Encoders and metadata
    for name in (
        "salary_encoders",
        "salary_feature_columns",
        "salary_skill_vocab",
        "salary_company_scale_meta",
        "salary_titles",
        "salary_premiums",
        "tfidf_vectorizer",
        "tfidf_matrix",
        "tfidf_role_index",
        "cluster_labels",
        "cluster_tsne",
        "cluster_role_index",
        "cluster_feature_matrix",
    ):
        path = base / f"{name}.joblib"
        if path.exists():
            registry[name] = joblib.load(path)

    return registry


@asynccontextmanager
async def lifespan(app: FastAPI):
    global model_registry, resolved_model_dir
    resolved_model_dir = str(_resolve_model_dir(settings.model_dir))
    model_registry.clear()
    model_registry.update(_load_models(settings.model_dir))
    loaded = list(model_registry.keys())
    print(f"Model dir: {resolved_model_dir}")
    print(f"Loaded models: {loaded}")
    yield
    model_registry.clear()


app = FastAPI(
    title="Job Market Intelligence API",
    version=settings.version,
    lifespan=lifespan,
)

# CORS
origins = [o.strip() for o in settings.allowed_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Routers
from app.routers import clustering, health, salary, skill_gap  # noqa: E402

app.include_router(health.router, prefix="/api/v1")
app.include_router(salary.router, prefix="/api/v1")
app.include_router(skill_gap.router, prefix="/api/v1")
app.include_router(clustering.router, prefix="/api/v1")
app.middleware("http")(ml_service_auth_middleware)
app.middleware("http")(ml_rate_limit_middleware)
