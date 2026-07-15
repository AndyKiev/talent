from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional


class CandidateNoteAuthorMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    code: Optional[str] = None


class CandidateNoteCreate(BaseModel):
    candidate_id: int
    body: str


class CandidateNoteSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    candidate_id: int
    author_id: int
    body: str
    created_at: datetime
    author: Optional[CandidateNoteAuthorMini] = None
