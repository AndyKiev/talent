from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Recommendation = Literal["hire", "no_hire", "maybe"]


class InterviewEmployeeMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    code: str | None = None


class InterviewCandidateMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    first_name: str
    last_name: str


class InterviewJobMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class InterviewInterviewerMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    employee_id: int
    # Filled by the service via a column lookup (model relationship is noload).
    employee: InterviewEmployeeMini | None = None


class InterviewFeedbackSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    interview_id: int
    author_id: int
    body: str
    recommendation: Recommendation | None = None
    created_at: datetime
    author: InterviewEmployeeMini | None = None


class InterviewCreate(BaseModel):
    application_id: int
    scheduled_at: datetime
    location: str = Field(..., max_length=256)
    # 1..3 interviewers, all holding a manager-category job.
    interviewer_ids: list[int] = Field(..., min_length=1, max_length=3)


class InterviewUpdate(BaseModel):
    scheduled_at: datetime | None = None
    location: str | None = Field(None, max_length=256)
    interviewer_ids: list[int] | None = Field(None, min_length=1, max_length=3)


class InterviewSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    application_id: int
    scheduled_at: datetime
    location: str
    created_by: int
    created_at: datetime
    interviewers: list[InterviewInterviewerMini] = []
    feedbacks: list[InterviewFeedbackSchema] = []
    # Enriched by the service from the application (noload relationships).
    candidate: InterviewCandidateMini | None = None
    job: InterviewJobMini | None = None
    recruitment_task_id: int | None = None


class InterviewFeedbackCreate(BaseModel):
    interview_id: int
    body: str
    recommendation: Recommendation | None = None
