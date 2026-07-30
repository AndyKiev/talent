from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Recommendation = Literal["hire", "no_hire", "maybe"]


class RecruitmentInterviewEmployeeMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    code: str | None = None


class RecruitmentInterviewCandidateMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    first_name: str
    last_name: str


class RecruitmentInterviewJobMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class RecruitmentInterviewInterviewerMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    employee_id: int
    # Filled by the service via a column lookup (model relationship is noload).
    employee: RecruitmentInterviewEmployeeMini | None = None


class RecruitmentInterviewFeedbackSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    interview_id: int
    created_by: int
    body: str
    recommendation: Recommendation | None = None
    created_at: datetime
    creator: RecruitmentInterviewEmployeeMini | None = None


class RecruitmentInterviewCreate(BaseModel):
    application_id: int
    scheduled_at: datetime
    location: str = Field(..., max_length=256)
    # 1..3 interviewers, all holding a manager-category job.
    interviewer_ids: list[int] = Field(..., min_length=1, max_length=3)


class RecruitmentInterviewUpdate(BaseModel):
    scheduled_at: datetime | None = None
    location: str | None = Field(None, max_length=256)
    interviewer_ids: list[int] | None = Field(None, min_length=1, max_length=3)


class RecruitmentInterviewSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    application_id: int
    scheduled_at: datetime
    location: str
    created_by: int
    created_at: datetime
    interviewers: list[RecruitmentInterviewInterviewerMini] = []
    feedbacks: list[RecruitmentInterviewFeedbackSchema] = []
    # Enriched by the service from the application (noload relationships).
    candidate: RecruitmentInterviewCandidateMini | None = None
    job: RecruitmentInterviewJobMini | None = None
    recruitment_task_id: int | None = None


class RecruitmentInterviewFeedbackCreate(BaseModel):
    interview_id: int
    body: str
    recommendation: Recommendation | None = None
