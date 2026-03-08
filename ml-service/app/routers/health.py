from fastapi import APIRouter

from app.config import settings
import app.main as app_main
from app.schemas.health import HealthResponse

router = APIRouter(tags=["health"])
REQUIRED_SALARY_ARTIFACTS = frozenset({"salary_median", "salary_p10", "salary_p90"})


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Service health check",
    response_description="Service status, loaded artifact list, and version",
)
async def health():
    """
    Check that the ML service is running and all model artifacts are loaded.

    Returns `models_loaded: true` when the salary median, P10, and P90 LightGBM
    models are ready. Use this endpoint to confirm the service is warm before
    sending prediction requests — especially after a cold start on Fly.io.
    """
    loaded_keys = set(app_main.model_registry.keys())
    return {
        "status": "ok",
        "models_loaded": REQUIRED_SALARY_ARTIFACTS.issubset(loaded_keys),
        "loaded_artifacts": sorted(loaded_keys),
        "model_dir": app_main.resolved_model_dir or settings.model_dir,
        "version": settings.version,
    }
