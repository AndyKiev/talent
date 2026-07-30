from pydantic import BaseModel, ConfigDict, Field


class RecruitmentCandidateSourceBase(BaseModel):
    key: str = Field(..., max_length=64)
    description: str | None = None
    sort_order: int = 0


class RecruitmentCandidateSourceCreate(RecruitmentCandidateSourceBase):
    pass


class RecruitmentCandidateSourceUpdate(BaseModel):
    key: str | None = Field(None, max_length=64)
    description: str | None = None
    sort_order: int | None = None


class RecruitmentCandidateSource(RecruitmentCandidateSourceBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
