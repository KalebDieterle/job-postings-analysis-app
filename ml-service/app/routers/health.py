from fastapi import APIRouter

from app.config import settings
import app.main as app_main

router = APIRouter(tags=["health"])


@router.get("/health")
async def health():
    return {
        "status": "ok",
        "models_loaded": list(app_main.model_registry.keys()),
        "model_dir": app_main.resolved_model_dir or settings.model_dir,
        "version": settings.version,
    }
