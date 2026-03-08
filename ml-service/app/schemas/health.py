from typing import Literal

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Stable response contract for the ML service health endpoint."""

    status: Literal["ok"] = Field(description="Service liveness status")
    models_loaded: bool = Field(
        description="Whether the required salary prediction artifacts are loaded"
    )
    loaded_artifacts: list[str] = Field(
        description="Serialized artifacts currently loaded into memory"
    )
    model_dir: str = Field(description="Resolved model directory used at startup")
    version: str = Field(description="ML service version")
