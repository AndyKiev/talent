from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RecruitmentCandidateSourceMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    key: str


class RecruitmentCandidatePhoneMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    phone: str
    sort_order: int


class RecruitmentCandidateBase(BaseModel):
    first_name: str = Field(..., max_length=128)
    last_name: str = Field(..., max_length=128)
    email: str | None = Field(None, max_length=128)
    candidate_source_id: int | None = None


class RecruitmentCandidateCreate(RecruitmentCandidateBase):
    # Several phone numbers, in display order.
    phones: list[str] = Field(default_factory=list)


class RecruitmentCandidateUpdate(BaseModel):
    first_name: str | None = Field(None, max_length=128)
    last_name: str | None = Field(None, max_length=128)
    email: str | None = Field(None, max_length=128)
    candidate_source_id: int | None = None
    # None = leave phones unchanged; [] = clear all; a list replaces them.
    phones: list[str] | None = None


class RecruitmentCandidateSchema(RecruitmentCandidateBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_by: int
    created_at: datetime
    source: RecruitmentCandidateSourceMini | None = None
    phones: list[RecruitmentCandidatePhoneMini] = Field(default_factory=list)
    # Derived (set in service): how many tasks the candidate is applied to and
    # the furthest pipeline stage reached across them.
    application_count: int = 0
    furthest_stage: str | None = None
    furthest_stage_sort: int | None = None
