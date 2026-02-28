from fastapi import APIRouter, HTTPException

from app.main import model_registry
from app.models.skill_gap_inference import analyze_skill_gap, get_available_roles
from app.schemas.skill_gap import SkillGapRequest, SkillGapResponse

router = APIRouter(tags=["skill-gap"])


@router.post("/skill-gap/analyze", response_model=SkillGapResponse)
async def skill_gap_analyze(req: SkillGapRequest):
    required_keys = ("tfidf_vectorizer", "tfidf_matrix", "tfidf_role_index")
    if not all(k in model_registry for k in required_keys):
        raise HTTPException(status_code=503, detail="TF-IDF models not loaded")

    result = analyze_skill_gap(
        req,
        model_registry["tfidf_vectorizer"],
        model_registry["tfidf_matrix"],
        model_registry["tfidf_role_index"],
    )
    return result


@router.get("/skill-gap/roles")
async def skill_gap_roles():
    if "tfidf_role_index" not in model_registry:
        raise HTTPException(status_code=503, detail="TF-IDF models not loaded")
    return get_available_roles(model_registry["tfidf_role_index"])
