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


@router.post(
    "/salary/predict",
    response_model=SalaryPredictionResponse,
    summary="Predict salary range",
    response_description="Median, P10, and P90 salary estimates with feature attribution",
)
async def salary_predict(req: SalaryPredictionRequest):
    """
    Predict salary range for a job posting using a LightGBM quantile regression model.

    Returns the **median** (P50) salary, a **lower bound** (P10), and an **upper bound**
    (P90) estimate. The 80th-percentile interval (P10–P90) represents the range within
    which 80% of similar real job postings fall.

    Also returns a ranked list of `factors` — the features that most influenced this
    prediction — and any post-model `adjustments` (e.g. location premium, company size).

    **Quick start:**
    1. Call `GET /api/v1/salary/metadata` to get valid skill abbreviations and titles.
    2. Submit this endpoint with at minimum a `title`.
    3. Add `skills`, `experience_level`, and `location` for higher confidence.
    """
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


@router.get(
    "/salary/metadata",
    response_model=SalaryMetadataResponse,
    summary="Get valid prediction inputs",
    response_description="Skills, job titles, and company scale tiers known to the model",
)
async def salary_metadata(
    q: str | None = Query(default=None, description="Filter titles by prefix (case-insensitive)", max_length=120),
    limit: int = Query(default=15, description="Maximum number of titles to return", ge=1, le=100),
):
    """
    Retrieve metadata needed to build a valid `/salary/predict` request.

    Returns:
    - **skills**: All skill abbreviations recognized by the model, sorted by training frequency.
      Pass these in the `skills` array of the predict request.
    - **titles**: Job titles known to the model. Use `?q=soft` to search by prefix.
    - **company_scale_tiers**: Valid values for the `company_scale_tier` field.

    This endpoint does **not** require authentication and is safe to call frequently.
    """
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
