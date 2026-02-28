from fastapi import APIRouter, HTTPException, Query

from app.main import model_registry
from app.models.salary_inference import predict_salary
from app.schemas.salary import (
    SalaryMetadataResponse,
    SalaryPredictionRequest,
    SalaryPredictionResponse,
)

router = APIRouter(tags=["salary"])

DEFAULT_TIERS = [
    {"value": "micro", "label": "Micro (1-25 postings)"},
    {"value": "small", "label": "Small (26-100 postings)"},
    {"value": "mid", "label": "Mid (101-500 postings)"},
    {"value": "large", "label": "Large (501-2000 postings)"},
    {"value": "enterprise", "label": "Enterprise (2000+ postings)"},
]


@router.post("/salary/predict", response_model=SalaryPredictionResponse)
async def salary_predict(req: SalaryPredictionRequest):
    required_keys = (
        "salary_median",
        "salary_p10",
        "salary_p90",
        "salary_encoders",
        "salary_feature_columns",
    )
    if not all(k in model_registry for k in required_keys):
        raise HTTPException(status_code=503, detail="Salary models not loaded")

    result = predict_salary(
        req,
        model_registry["salary_median"],
        model_registry["salary_p10"],
        model_registry["salary_p90"],
        model_registry["salary_encoders"],
        model_registry["salary_feature_columns"],
        model_registry.get("salary_skill_vocab"),
        model_registry.get("salary_company_scale_meta"),
        model_registry.get("salary_premiums"),
    )
    return result


@router.get("/salary/metadata", response_model=SalaryMetadataResponse)
async def salary_metadata(
    q: str | None = Query(default=None, max_length=120),
    limit: int = Query(default=15, ge=1, le=100),
):
    skill_vocab = model_registry.get("salary_skill_vocab")
    if isinstance(skill_vocab, dict):
        skills = skill_vocab.get("skills", [])
    else:
        skills = []

    all_titles = model_registry.get("salary_titles")
    if isinstance(all_titles, list):
        titles = all_titles
    else:
        titles = []

    if q:
        q_lower = q.strip().lower()
        titles = [t for t in titles if str(t.get("title", "")).startswith(q_lower)]

    titles = titles[:limit]

    scale_meta = model_registry.get("salary_company_scale_meta")
    if isinstance(scale_meta, dict):
        company_scale_tiers = scale_meta.get("tiers", DEFAULT_TIERS)
    else:
        company_scale_tiers = DEFAULT_TIERS

    return SalaryMetadataResponse(
        skills=skills,
        titles=titles,
        company_scale_tiers=company_scale_tiers,
    )
