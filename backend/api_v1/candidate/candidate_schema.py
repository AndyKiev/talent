from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional


class CandidateSourceMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    key: str


class CandidateCreatorMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    code: Optional[str] = None


class CandidatePhoneMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    phone: str
    sort_order: int


class CandidateBase(BaseModel):
    first_name: str = Field(..., max_length=128)
    last_name: str = Field(..., max_length=128)
    email: Optional[str] = Field(None, max_length=128)
    source_id: Optional[int] = None


class CandidateCreate(CandidateBase):
    # Several phone numbers, in display order.
    phones: List[str] = Field(default_factory=list)


class CandidateUpdate(BaseModel):
    first_name: Optional[str] = Field(None, max_length=128)
    last_name: Optional[str] = Field(None, max_length=128)
    email: Optional[str] = Field(None, max_length=128)
    source_id: Optional[int] = None
    # None = leave phones unchanged; [] = clear all; a list replaces them.
    phones: Optional[List[str]] = None


class CandidateSchema(CandidateBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_by: int
    created_at: datetime
    source: Optional[CandidateSourceMini] = None
    creator: Optional[CandidateCreatorMini] = None
    phones: List[CandidatePhoneMini] = Field(default_factory=list)
    # Derived (set in service): how many tasks the candidate is applied to and
    # the furthest pipeline stage reached across them.
    application_count: int = 0
    furthest_stage: Optional[str] = None
    furthest_stage_sort: Optional[int] = None
