from pydantic import BaseModel, ConfigDict, Field
from typing import Optional


class CandidateSourceBase(BaseModel):
    key: str = Field(..., max_length=64)
    description: Optional[str] = None
    sort_order: int = 0


class CandidateSourceCreate(CandidateSourceBase):
    pass


class CandidateSourceUpdate(BaseModel):
    key: Optional[str] = Field(None, max_length=64)
    description: Optional[str] = None
    sort_order: Optional[int] = None


class CandidateSource(CandidateSourceBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
