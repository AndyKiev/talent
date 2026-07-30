from datetime import datetime

from pydantic import BaseModel, ConfigDict


class RecruitmentCandidateNoteAuthorMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    code: str | None = None


class RecruitmentCandidateNoteCreate(BaseModel):
    candidate_id: int
    body: str


class RecruitmentCandidateNoteSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    candidate_id: int
    created_by: int
    body: str
    created_at: datetime
    creator: RecruitmentCandidateNoteAuthorMini | None = None
