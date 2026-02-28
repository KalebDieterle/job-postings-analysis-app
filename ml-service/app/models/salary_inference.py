from typing import Any

import lightgbm as lgb
import numpy as np
import pandas as pd

from app.schemas.salary import (
    SalaryAdjustment,
    SalaryFactor,
    SalaryPredictionRequest,
    SalaryPredictionResponse,
)

EXPERIENCE_ORDINAL = {
    "": -1,
    "internship": 0,
    "entry level": 1,
    "entry": 1,
    "associate": 2,
    "mid-senior level": 3,
    "mid-senior": 3,
    "director": 4,
    "executive": 5,
}

DEFAULT_TIER_ORDER = ["micro", "small", "mid", "large", "enterprise"]
DEFAULT_SCALE_META = {
    "boundaries": [25, 100, 500, 2000],
    "tier_order": DEFAULT_TIER_ORDER,
    "representative_counts": {
        "micro": 15,
        "small": 65,
        "mid": 280,
        "large": 1200,
        "enterprise": 3000,
    },
}


def _parse_city_state(location: str) -> tuple[str, str]:
    """Split 'City, State' into (city, state)."""
    parts = [p.strip() for p in str(location or "").split(",", 1)]
    city = parts[0] if parts else ""
    state = parts[1] if len(parts) > 1 else ""
    return city.lower(), state.lower()


def _resolve_known_skills(skills: list[str], salary_skill_vocab: Any) -> list[str]:
    if isinstance(salary_skill_vocab, dict):
        skill_abrs = salary_skill_vocab.get("skill_abrs", [])
        valid = {str(s).upper() for s in skill_abrs}
        return [s.upper() for s in skills if s.upper() in valid]

    # Backward compatibility: if artifact is missing, just pass through upper-cased skills.
    return [s.upper() for s in skills]


def _resolve_tier_from_count(value: float, boundaries: list[int]) -> str:
    if value <= 0:
        return "mid"

    b0, b1, b2, b3 = boundaries
    if value <= b0:
        return "micro"
    if value <= b1:
        return "small"
    if value <= b2:
        return "mid"
    if value <= b3:
        return "large"
    return "enterprise"


def _resolve_company_scale_tier(
    req: SalaryPredictionRequest,
    company_scale_meta: Any,
) -> tuple[str, float]:
    scale_meta = company_scale_meta if isinstance(company_scale_meta, dict) else DEFAULT_SCALE_META
    tier_order = scale_meta.get("tier_order", DEFAULT_TIER_ORDER)
    boundaries = scale_meta.get("boundaries", DEFAULT_SCALE_META["boundaries"])
    representative_counts = scale_meta.get(
        "representative_counts", DEFAULT_SCALE_META["representative_counts"]
    )

    if req.company_scale_tier and req.company_scale_tier in tier_order:
        tier = req.company_scale_tier
        return tier, float(representative_counts.get(tier, 0) or 0)

    if req.employee_count is not None and req.employee_count > 0:
        tier = _resolve_tier_from_count(float(req.employee_count), boundaries)
        return tier, float(representative_counts.get(tier, 0) or 0)

    return "mid", float(representative_counts.get("mid", 0) or 0)


def _apply_premiums(
    role_title: str,
    selected_skills: list[str],
    company_tier: str,
    prediction_median: float,
    prediction_p10: float,
    prediction_p90: float,
    salary_premiums: Any,
) -> tuple[float, float, float, list[SalaryAdjustment]]:
    if not isinstance(salary_premiums, dict):
        return prediction_median, prediction_p10, prediction_p90, []

    role_key = role_title.lower()

    role_skill_deltas = salary_premiums.get("role_skill_deltas", {})
    global_skill_deltas = salary_premiums.get("global_skill_deltas", {})
    role_tier_deltas = salary_premiums.get("role_tier_deltas", {})
    global_tier_deltas = salary_premiums.get("global_tier_deltas", {})

    skill_weight = float(salary_premiums.get("skill_weight", 1.0))
    tier_weight = float(salary_premiums.get("tier_weight", 1.0))
    max_ratio = float(salary_premiums.get("max_adjustment_ratio", 0.35))
    max_absolute = float(salary_premiums.get("max_absolute_adjustment", 60_000))

    per_skill_deltas: list[float] = []
    role_skill_map = role_skill_deltas.get(role_key, {})

    for skill in selected_skills:
        feature_key = f"skill_{skill}"
        if feature_key in role_skill_map:
            per_skill_deltas.append(float(role_skill_map[feature_key]))
        elif feature_key in global_skill_deltas:
            per_skill_deltas.append(float(global_skill_deltas[feature_key]))

    skill_delta = (float(np.mean(per_skill_deltas)) if per_skill_deltas else 0.0) * skill_weight

    role_tier_map = role_tier_deltas.get(role_key, {})
    tier_delta = float(role_tier_map.get(company_tier, global_tier_deltas.get(company_tier, 0.0)))
    tier_delta *= tier_weight

    total_delta = skill_delta + tier_delta
    max_allowed = min(max_absolute, abs(prediction_median) * max_ratio)
    total_delta = max(-max_allowed, min(max_allowed, total_delta))

    adjustments: list[SalaryAdjustment] = []
    if abs(skill_delta) >= 1:
        adjustments.append(SalaryAdjustment(source="skills", delta=round(skill_delta)))
    if abs(tier_delta) >= 1:
        adjustments.append(SalaryAdjustment(source="company_scale", delta=round(tier_delta)))

    return (
        prediction_median + total_delta,
        prediction_p10 + total_delta,
        prediction_p90 + total_delta,
        adjustments,
    )


def predict_salary(
    req: SalaryPredictionRequest,
    model_median: lgb.Booster,
    model_p10: lgb.Booster,
    model_p90: lgb.Booster,
    encoders: dict,
    feature_columns: list[str],
    salary_skill_vocab: Any = None,
    company_scale_meta: Any = None,
    salary_premiums: Any = None,
) -> SalaryPredictionResponse:
    city, state = _parse_city_state(req.location)
    exp_ord = EXPERIENCE_ORDINAL.get(req.experience_level.strip().lower(), -1)

    company_tier, company_posting_count = _resolve_company_scale_tier(req, company_scale_meta)
    known_skills = _resolve_known_skills(req.skills, salary_skill_vocab)

    features: dict[str, Any] = {
        "title": req.title.lower(),
        "city": city,
        "state": state,
        "country": req.country.lower(),
        "experience_ordinal": exp_ord,
        "work_type": req.work_type.lower() if req.work_type else "",
        "remote_allowed": int(req.remote_allowed) if req.remote_allowed is not None else -1,
        "has_employee_count": 1 if req.employee_count is not None else 0,
        "log_employee_count": float(np.log1p(req.employee_count)) if req.employee_count else 0.0,
        "has_company_posting_count": 1 if company_posting_count > 0 else 0,
        "company_posting_count": company_posting_count,
        "log_company_posting_count": float(np.log1p(company_posting_count)) if company_posting_count > 0 else 0.0,
        "company_scale_tier_proxy": company_tier,
    }

    req_skills_set = set(known_skills)

    if isinstance(salary_skill_vocab, dict):
        skill_abrs = [str(s).upper() for s in salary_skill_vocab.get("skill_abrs", [])]
    else:
        skill_abrs = []

    for skill in skill_abrs:
        features[f"skill_{skill}"] = 1 if skill in req_skills_set else 0

    top_industries = encoders.get("top_industries", [])
    req_industries_set = set(req.industries)
    for ind in top_industries:
        features[f"ind_{ind}"] = 1 if ind in req_industries_set else 0

    df = pd.DataFrame([features])

    target_encoder = encoders.get("target_encoder")
    if target_encoder is not None:
        if hasattr(target_encoder, "cols") and target_encoder.cols:
            cat_cols = [str(c) for c in target_encoder.cols if str(c) in df.columns]
        else:
            cat_cols = [
                c
                for c in ["title", "city", "state", "country", "work_type", "company_scale_tier_proxy"]
                if c in df.columns
            ]

        if cat_cols:
            df[cat_cols] = target_encoder.transform(df[cat_cols])

    for col in feature_columns:
        if col not in df.columns:
            df[col] = 0
    df = df[feature_columns]

    pred_median = float(model_median.predict(df)[0])
    pred_p10 = float(model_p10.predict(df)[0])
    pred_p90 = float(model_p90.predict(df)[0])

    pred_median, pred_p10, pred_p90, adjustments = _apply_premiums(
        role_title=req.title,
        selected_skills=known_skills,
        company_tier=company_tier,
        prediction_median=pred_median,
        prediction_p10=pred_p10,
        prediction_p90=pred_p90,
        salary_premiums=salary_premiums,
    )

    pred_median = max(20_000, min(500_000, pred_median))
    pred_p10 = max(20_000, min(pred_median, pred_p10))
    pred_p90 = max(pred_median, min(500_000, pred_p90))

    salary_range = pred_p90 - pred_p10
    confidence = max(0.1, min(1.0, 1.0 - (salary_range / max(pred_median, 1.0)) * 0.5))

    importances = model_median.feature_importance(importance_type="gain")
    feature_names = model_median.feature_name()
    denom = float(importances.sum()) if float(importances.sum()) > 0 else 1.0
    sorted_idx = np.argsort(importances)[::-1][:5]
    factors = [
        SalaryFactor(
            feature=feature_names[i],
            importance=round(float(importances[i] / denom), 4),
        )
        for i in sorted_idx
    ]

    return SalaryPredictionResponse(
        predicted_salary=int(round(pred_median)),
        lower_bound=int(round(pred_p10)),
        upper_bound=int(round(pred_p90)),
        confidence=round(confidence, 3),
        factors=factors,
        adjustments=adjustments,
    )
