from pydantic import BaseModel, Field


class SkillGapRequest(BaseModel):
    current_skills: list[str] = Field(..., description="User's current skills")
    target_role: str = Field(..., description="Target role name or slug")


class SkillDetail(BaseModel):
    skill: str
    importance: float = Field(description="TF-IDF importance score 0-1")
    status: str = Field(description="matched, gap, or bonus")


class SkillGapResponse(BaseModel):
    canonical_role: str
    match_percentage: float
    skills: list[SkillDetail]
    learning_priority: list[str] = Field(description="Gap skills ordered by importance")
