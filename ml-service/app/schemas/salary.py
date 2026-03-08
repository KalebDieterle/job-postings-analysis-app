from pydantic import BaseModel, Field


class SalaryPredictionRequest(BaseModel):
    """Input schema for salary prediction. Provide at minimum a job title."""

    title: str = Field(
        ...,
        description="Job title (canonical or variant), e.g. 'Software Engineer'",
        max_length=120,
        examples=["Software Engineer", "Data Scientist"],
    )
    location: str = Field(
        "",
        description="Location string, e.g. 'San Francisco, CA' or 'Remote'",
        max_length=120,
    )
    country: str = Field(
        "us",
        description="ISO 3166-1 alpha-2 country code (default: 'us')",
        max_length=2,
        examples=["us", "gb", "ca"],
    )
    experience_level: str = Field(
        "",
        description="Seniority level: Entry, Associate, Mid-Senior, Director, or Executive",
        examples=["Entry", "Mid-Senior", "Director"],
    )
    work_type: str = Field(
        "",
        description="Employment type: Full-time, Part-time, Contract, Internship, etc.",
        examples=["Full-time", "Contract"],
    )
    remote_allowed: bool | None = Field(
        None,
        description="Whether the role allows remote work. null = unknown.",
    )
    skills: list[str] = Field(
        default_factory=list,
        description="List of skill abbreviations from /api/v1/salary/metadata (e.g. ['python', 'sql', 'aws'])",
        max_length=50,
    )
    industries: list[str] = Field(
        default_factory=list,
        description="List of industry IDs from the job postings dataset",
    )
    employee_count: int | None = Field(
        None,
        description="Approximate company headcount. Used to estimate company scale when company_scale_tier is not set.",
        ge=1,
    )
    company_scale_tier: str | None = Field(
        None,
        description="Company scale tier: micro, small, mid, large, or enterprise. Overrides employee_count for scale estimation.",
        examples=["small", "enterprise"],
    )


class SalaryFactor(BaseModel):
    """A single feature contribution to the salary prediction."""

    feature: str = Field(description="Human-readable feature name (e.g. 'Python skill premium')")
    importance: float = Field(description="Relative importance score (0–1 scale, higher = more influential)")


class SalaryAdjustment(BaseModel):
    """A post-model salary adjustment applied on top of the base prediction."""

    source: str = Field(description="Adjustment source label (e.g. 'location_premium', 'remote_discount')")
    delta: int = Field(description="Dollar adjustment added to the base prediction (can be negative)")


class SalaryPredictionResponse(BaseModel):
    """
    Salary prediction result with P10/P90 confidence interval and
    feature importance breakdown.
    """

    predicted_salary: int = Field(
        description="Median salary prediction in USD/year"
    )
    lower_bound: int = Field(
        description="P10 salary estimate — 10% of similar roles pay less than this (USD/year)"
    )
    upper_bound: int = Field(
        description="P90 salary estimate — 90% of similar roles pay less than this (USD/year)"
    )
    confidence: float = Field(
        description="Model confidence score between 0 and 1. Higher means the input closely matches training data."
    )
    factors: list[SalaryFactor] = Field(
        description="Top features driving this prediction, ordered by importance"
    )
    adjustments: list[SalaryAdjustment] = Field(
        default_factory=list,
        description="Post-model adjustments applied (e.g. location premium, company size)",
    )


class SalaryMetadataSkill(BaseModel):
    """A skill available for use in salary predictions."""

    abr: str = Field(description="Skill abbreviation to pass in the 'skills' array of /predict")
    name: str = Field(description="Full human-readable skill name")
    freq: int = Field(description="Number of job postings in training data that required this skill")


class SalaryMetadataTitle(BaseModel):
    """A job title known to the salary model."""

    title: str = Field(description="Canonical job title string")
    count: int = Field(description="Number of postings in training data with this title")


class SalaryCompanyScaleTier(BaseModel):
    """A company scale tier label for the company_scale_tier field."""

    value: str = Field(description="Machine-readable tier value to pass in requests")
    label: str = Field(description="Human-readable tier label")


class SalaryMetadataResponse(BaseModel):
    """
    Metadata needed to build a valid salary prediction request:
    available skills, known job titles, and company scale tiers.
    """

    skills: list[SalaryMetadataSkill] = Field(
        description="Skills recognized by the model, sorted by frequency"
    )
    titles: list[SalaryMetadataTitle] = Field(
        description="Job titles known to the model. Use ?q= to search by prefix."
    )
    company_scale_tiers: list[SalaryCompanyScaleTier] = Field(
        description="Valid company scale tier values for the company_scale_tier field"
    )
