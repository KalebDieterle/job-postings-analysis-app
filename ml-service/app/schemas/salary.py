from pydantic import BaseModel, Field


class SalaryPredictionRequest(BaseModel):
    title: str = Field(..., description="Job title (canonical or variant)")
    location: str = Field("", description="Location string e.g. 'San Francisco, CA'")
    country: str = Field("us", description="ISO country code")
    experience_level: str = Field("", description="Entry, Associate, Mid-Senior, Director, Executive")
    work_type: str = Field("", description="Full-time, Part-time, Contract, etc.")
    remote_allowed: bool | None = Field(None)
    skills: list[str] = Field(default_factory=list, description="List of skill abbreviations")
    industries: list[str] = Field(default_factory=list, description="List of industry IDs")
    employee_count: int | None = Field(None, description="Company employee count")
    company_scale_tier: str | None = Field(
        None,
        description="Proxy company scale tier (micro, small, mid, large, enterprise)",
    )


class SalaryFactor(BaseModel):
    feature: str
    importance: float


class SalaryAdjustment(BaseModel):
    source: str
    delta: int


class SalaryPredictionResponse(BaseModel):
    predicted_salary: int
    lower_bound: int
    upper_bound: int
    confidence: float = Field(description="Model confidence 0-1")
    factors: list[SalaryFactor]
    adjustments: list[SalaryAdjustment] = Field(default_factory=list)


class SalaryMetadataSkill(BaseModel):
    abr: str
    name: str
    freq: int


class SalaryMetadataTitle(BaseModel):
    title: str
    count: int


class SalaryCompanyScaleTier(BaseModel):
    value: str
    label: str


class SalaryMetadataResponse(BaseModel):
    skills: list[SalaryMetadataSkill]
    titles: list[SalaryMetadataTitle]
    company_scale_tiers: list[SalaryCompanyScaleTier]
