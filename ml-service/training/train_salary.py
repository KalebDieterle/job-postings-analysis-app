"""Train LightGBM salary prediction models (median, P10, P90)."""

import os
from pathlib import Path
from typing import Any

import joblib
import lightgbm as lgb
import numpy as np
import pandas as pd
from category_encoders import TargetEncoder
from sklearn.model_selection import train_test_split

from export_data import export_salary_data, export_salary_skill_vocab

MODEL_DIR = Path(os.getenv("MODEL_DIR", "../models"))

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

TIER_ORDER = ["micro", "small", "mid", "large", "enterprise"]
TIER_LABELS = {
    "micro": "Micro (1-25 postings)",
    "small": "Small (26-100 postings)",
    "mid": "Mid (101-500 postings)",
    "large": "Large (501-2000 postings)",
    "enterprise": "Enterprise (2000+ postings)",
}


def _parse_city_state(location: str) -> tuple[str, str]:
    if not location or pd.isna(location):
        return "", ""
    parts = [p.strip() for p in str(location).split(",", 1)]
    city = parts[0].lower() if parts else ""
    state = parts[1].lower() if len(parts) > 1 else ""
    return city, state


def _coerce_remote_allowed(value: object) -> int:
    if value is None or pd.isna(value):
        return -1

    if isinstance(value, bool):
        return 1 if value else 0

    if isinstance(value, (int, np.integer)):
        return int(value)

    if isinstance(value, (float, np.floating)):
        return int(value)

    text = str(value).strip().lower()
    if text in {"true", "t", "yes", "y"}:
        return 1
    if text in {"false", "f", "no", "n"}:
        return 0

    try:
        return int(float(text))
    except (ValueError, TypeError):
        return -1


def _ensure_skill_list(value: object) -> list[str]:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return []
    if isinstance(value, list):
        return [str(v).upper() for v in value if v is not None]
    if isinstance(value, tuple):
        return [str(v).upper() for v in value if v is not None]
    return []


def _build_skill_vocab(vocab_df: pd.DataFrame) -> tuple[list[dict[str, Any]], list[str]]:
    if vocab_df.empty:
        return [], []

    entries: list[dict[str, Any]] = []
    for _, row in vocab_df.iterrows():
        abr = str(row.get("skill_abr", "") or "").upper().strip()
        if not abr:
            continue
        name = str(row.get("skill_name", "") or abr).strip()
        freq = int(row.get("freq", 0) or 0)
        entries.append({"abr": abr, "name": name, "freq": freq})

    entries.sort(key=lambda x: x["freq"], reverse=True)
    skill_abrs = [entry["abr"] for entry in entries]
    return entries, skill_abrs


def _resolve_scale_boundaries(df: pd.DataFrame) -> list[int]:
    series = pd.to_numeric(df.get("company_posting_count"), errors="coerce")
    values = series.dropna()
    values = values[values > 0]
    if values.empty:
        return [25, 100, 500, 2000]

    quantiles = values.quantile([0.2, 0.4, 0.6, 0.8]).tolist()
    boundaries = [max(1, int(round(q))) for q in quantiles]

    # Guarantee strictly increasing boundaries.
    fixed: list[int] = []
    current = 1
    for boundary in boundaries:
        current = max(current, boundary)
        fixed.append(current)
        current += 1

    return fixed


def _posting_count_to_tier(company_posting_count: object, boundaries: list[int]) -> str:
    value = pd.to_numeric(company_posting_count, errors="coerce")
    if pd.isna(value) or value <= 0:
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


def _build_company_scale_meta(df: pd.DataFrame, boundaries: list[int]) -> dict[str, Any]:
    representative_counts: dict[str, int] = {}
    for tier in TIER_ORDER:
        tier_mask = df["company_scale_tier_proxy"] == tier
        counts = pd.to_numeric(df.loc[tier_mask, "company_posting_count"], errors="coerce").dropna()
        if counts.empty:
            representative_counts[tier] = 0
        else:
            representative_counts[tier] = int(round(float(counts.median())))

    tiers = [
        {"value": tier, "label": TIER_LABELS[tier]}
        for tier in TIER_ORDER
    ]

    return {
        "boundaries": boundaries,
        "tiers": tiers,
        "tier_order": TIER_ORDER,
        "tier_labels": TIER_LABELS,
        "representative_counts": representative_counts,
    }


def build_features(
    df: pd.DataFrame,
    skill_abrs: list[str],
    boundaries: list[int],
) -> pd.DataFrame:
    """Build feature DataFrame from raw exported data."""
    records: list[dict[str, Any]] = []

    for _, row in df.iterrows():
        city, state = _parse_city_state(row.get("location", ""))
        exp = str(row.get("formatted_experience_level", "") or "").lower()
        exp_ord = EXPERIENCE_ORDINAL.get(exp, -1)

        company_posting_count = pd.to_numeric(row.get("company_posting_count"), errors="coerce")
        has_company_posting_count = 0 if pd.isna(company_posting_count) else 1
        posting_count_value = 0.0 if pd.isna(company_posting_count) else float(company_posting_count)
        company_scale_tier = _posting_count_to_tier(posting_count_value, boundaries)

        feat: dict[str, Any] = {
            "title": str(row.get("canonical_title", "") or "").lower(),
            "city": city,
            "state": state,
            "country": str(row.get("country", "") or "").lower(),
            "experience_ordinal": exp_ord,
            "work_type": str(row.get("formatted_work_type", "") or "").lower(),
            "remote_allowed": _coerce_remote_allowed(row.get("remote_allowed")),
            "has_employee_count": 1 if pd.notna(row.get("employee_count")) else 0,
            "log_employee_count": float(np.log1p(row["employee_count"])) if pd.notna(row.get("employee_count")) else 0.0,
            "has_company_posting_count": has_company_posting_count,
            "company_posting_count": posting_count_value,
            "log_company_posting_count": float(np.log1p(posting_count_value)) if posting_count_value > 0 else 0.0,
            "company_scale_tier_proxy": company_scale_tier,
        }

        skills = _ensure_skill_list(row.get("skills"))
        for skill in skill_abrs:
            feat[f"skill_{skill}"] = 1 if skill in skills else 0

        industries = row.get("industries")
        if industries is None or (isinstance(industries, float) and pd.isna(industries)):
            industries = []

        feat["_industries"] = industries
        feat["_skills"] = skills
        feat["_target"] = row["yearly_min_salary"]
        records.append(feat)

    return pd.DataFrame(records)


def add_industry_features(df: pd.DataFrame, top_n: int = 20) -> tuple[pd.DataFrame, list[str]]:
    """Multi-hot encode top N industries."""
    from collections import Counter

    all_inds = Counter()
    for inds in df["_industries"]:
        if isinstance(inds, list):
            all_inds.update(inds)

    top_industries = [ind for ind, _ in all_inds.most_common(top_n)]

    for ind in top_industries:
        df[f"ind_{ind}"] = df["_industries"].apply(
            lambda x: 1 if isinstance(x, list) and ind in x else 0
        )

    df = df.drop(columns=["_industries"])
    return df, top_industries


def _compute_premium_deltas(
    frame: pd.DataFrame,
    key_column: str,
    feature_columns: list[str],
    min_support: int,
    shrinkage: int,
) -> tuple[dict[str, dict[str, float]], dict[str, float]]:
    role_deltas: dict[str, dict[str, float]] = {}
    global_deltas: dict[str, float] = {}

    overall_median = float(frame["_target"].median())

    for feature in feature_columns:
        feature_mask = frame[feature] == 1
        support = int(feature_mask.sum())
        if support < min_support:
            continue
        raw_delta = float(frame.loc[feature_mask, "_target"].median()) - overall_median
        weight = support / (support + shrinkage)
        global_deltas[feature] = raw_delta * weight

    for role, role_frame in frame.groupby("title"):
        role_median = float(role_frame["_target"].median())
        feature_delta: dict[str, float] = {}

        for feature in feature_columns:
            feature_mask = role_frame[feature] == 1
            support = int(feature_mask.sum())
            if support < min_support:
                continue
            raw_delta = float(role_frame.loc[feature_mask, "_target"].median()) - role_median
            weight = support / (support + shrinkage)
            feature_delta[feature] = raw_delta * weight

        if feature_delta:
            role_deltas[str(role)] = feature_delta

    return role_deltas, global_deltas


def _compute_tier_premiums(
    frame: pd.DataFrame,
    min_support: int,
    shrinkage: int,
) -> tuple[dict[str, dict[str, float]], dict[str, float]]:
    role_tier_deltas: dict[str, dict[str, float]] = {}
    global_tier_deltas: dict[str, float] = {}

    overall_median = float(frame["_target"].median())
    for tier in TIER_ORDER:
        mask = frame["company_scale_tier_proxy"] == tier
        support = int(mask.sum())
        if support < min_support:
            continue
        raw_delta = float(frame.loc[mask, "_target"].median()) - overall_median
        weight = support / (support + shrinkage)
        global_tier_deltas[tier] = raw_delta * weight

    for role, role_frame in frame.groupby("title"):
        role_median = float(role_frame["_target"].median())
        deltas: dict[str, float] = {}

        for tier in TIER_ORDER:
            mask = role_frame["company_scale_tier_proxy"] == tier
            support = int(mask.sum())
            if support < min_support:
                continue
            raw_delta = float(role_frame.loc[mask, "_target"].median()) - role_median
            weight = support / (support + shrinkage)
            deltas[tier] = raw_delta * weight

        if deltas:
            role_tier_deltas[str(role)] = deltas

    return role_tier_deltas, global_tier_deltas


def build_salary_premiums(
    df: pd.DataFrame,
    skill_abrs: list[str],
) -> dict[str, Any]:
    premiums_df = df[["title", "company_scale_tier_proxy", "_target"]].copy()

    for skill in skill_abrs:
        feature = f"skill_{skill}"
        premiums_df[feature] = df[feature]

    role_baselines = {
        str(role): float(group["_target"].median())
        for role, group in premiums_df.groupby("title")
    }

    skill_features = [f"skill_{skill}" for skill in skill_abrs]
    role_skill_deltas, global_skill_deltas = _compute_premium_deltas(
        premiums_df,
        key_column="title",
        feature_columns=skill_features,
        min_support=12,
        shrinkage=24,
    )

    role_tier_deltas, global_tier_deltas = _compute_tier_premiums(
        premiums_df,
        min_support=20,
        shrinkage=40,
    )

    return {
        "role_baselines": role_baselines,
        "global_baseline": float(premiums_df["_target"].median()),
        "role_skill_deltas": role_skill_deltas,
        "global_skill_deltas": global_skill_deltas,
        "role_tier_deltas": role_tier_deltas,
        "global_tier_deltas": global_tier_deltas,
        "skill_weight": 0.7,
        "tier_weight": 0.6,
        "max_adjustment_ratio": 0.35,
        "max_absolute_adjustment": 60_000,
    }


def train() -> None:
    print("=== Salary Model Training ===")

    raw_df = export_salary_data()
    if len(raw_df) < 50:
        print(f"Only {len(raw_df)} rows - too few for training. Aborting.")
        return

    skill_vocab_df = export_salary_skill_vocab()
    skill_vocab, skill_abrs = _build_skill_vocab(skill_vocab_df)
    if not skill_abrs:
        print("No salary skill vocabulary found. Aborting.")
        return

    boundaries = _resolve_scale_boundaries(raw_df)
    raw_df["company_scale_tier_proxy"] = raw_df["company_posting_count"].apply(
        lambda x: _posting_count_to_tier(x, boundaries)
    )
    scale_meta = _build_company_scale_meta(raw_df, boundaries)

    feat_df = build_features(raw_df, skill_abrs, boundaries)
    feat_df, top_industries = add_industry_features(feat_df)

    target = feat_df.pop("_target").values
    premium_source = feat_df.copy()
    premium_source["_target"] = target

    salary_premiums = build_salary_premiums(premium_source, skill_abrs)

    # _skills is only used to compute diagnostics/premiums.
    if "_skills" in feat_df.columns:
        feat_df = feat_df.drop(columns=["_skills"])

    print(f"Features: {feat_df.shape[1]} | Samples: {len(feat_df)}")
    print(
        "Target range: "
        f"${target.min():,.0f} - ${target.max():,.0f} "
        f"(median ${np.median(target):,.0f})"
    )

    X_train, X_test, y_train, y_test = train_test_split(
        feat_df, target, test_size=0.2, random_state=42
    )

    cat_cols = ["title", "city", "state", "country", "work_type", "company_scale_tier_proxy"]
    target_encoder = TargetEncoder(cols=cat_cols, smoothing=10)
    X_train[cat_cols] = target_encoder.fit_transform(X_train[cat_cols], y_train)
    X_test[cat_cols] = target_encoder.transform(X_test[cat_cols])

    feature_columns = list(X_train.columns)

    lgb_train = lgb.Dataset(X_train, label=y_train)
    lgb_test = lgb.Dataset(X_test, label=y_test, reference=lgb_train)

    base_params = {
        "num_leaves": 63,
        "learning_rate": 0.05,
        "feature_fraction": 0.8,
        "bagging_fraction": 0.8,
        "bagging_freq": 5,
        "min_data_in_leaf": 40,
        "verbose": -1,
        "n_jobs": -1,
    }

    models: dict[str, lgb.Booster] = {}

    print("\nTraining median model (MAE)...")
    params_median = {**base_params, "objective": "mae", "metric": "mae"}
    models["salary_median"] = lgb.train(
        params_median,
        lgb_train,
        num_boost_round=500,
        valid_sets=[lgb_test],
        callbacks=[lgb.log_evaluation(100), lgb.early_stopping(50)],
    )

    print("\nTraining P10 model (quantile 0.1)...")
    params_p10 = {**base_params, "objective": "quantile", "alpha": 0.1, "metric": "quantile"}
    models["salary_p10"] = lgb.train(
        params_p10,
        lgb_train,
        num_boost_round=500,
        valid_sets=[lgb_test],
        callbacks=[lgb.log_evaluation(100), lgb.early_stopping(50)],
    )

    print("\nTraining P90 model (quantile 0.9)...")
    params_p90 = {**base_params, "objective": "quantile", "alpha": 0.9, "metric": "quantile"}
    models["salary_p90"] = lgb.train(
        params_p90,
        lgb_train,
        num_boost_round=500,
        valid_sets=[lgb_test],
        callbacks=[lgb.log_evaluation(100), lgb.early_stopping(50)],
    )

    from sklearn.metrics import mean_absolute_error, r2_score

    preds = models["salary_median"].predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    r2 = r2_score(y_test, preds)
    mape = np.mean(np.abs((y_test - preds) / y_test)) * 100

    print("\n=== Evaluation ===")
    print(f"MAE:  ${mae:,.0f}")
    print(f"MAPE: {mape:.1f}%")
    print(f"R^2:  {r2:.4f}")

    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    for name, model in models.items():
        path = MODEL_DIR / f"{name}.lgb"
        model.save_model(str(path))
        print(f"Saved {path}")

    encoders = {
        "target_encoder": target_encoder,
        "top_industries": top_industries,
    }
    joblib.dump(encoders, MODEL_DIR / "salary_encoders.joblib")
    joblib.dump(feature_columns, MODEL_DIR / "salary_feature_columns.joblib")

    titles = (
        raw_df["canonical_title"]
        .fillna("")
        .astype(str)
        .str.strip()
        .str.lower()
        .value_counts()
    )
    salary_titles = [
        {"title": title, "count": int(count)}
        for title, count in titles.items()
        if title
    ]

    joblib.dump({"skills": skill_vocab, "skill_abrs": skill_abrs}, MODEL_DIR / "salary_skill_vocab.joblib")
    joblib.dump(scale_meta, MODEL_DIR / "salary_company_scale_meta.joblib")
    joblib.dump(salary_titles, MODEL_DIR / "salary_titles.joblib")
    joblib.dump(salary_premiums, MODEL_DIR / "salary_premiums.joblib")

    print("Saved encoders, feature columns, salary vocab, scale metadata, titles, and premiums")


if __name__ == "__main__":
    train()
