
from pydantic import BaseModel, ConfigDict, Field


class CandidateSourceBase(BaseModel):
    key: str = Field(..., max_length=64)
    description: str | None = None
    sort_order: int = 0


class CandidateSourceCreate(CandidateSourceBase):
    pass


class CandidateSourceUpdate(BaseModel):
    key: str | None = Field(None, max_length=64)
    description: str | None = None
    sort_order: int | None = None


class CandidateSource(CandidateSourceBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
