from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from typing import List, Literal, Optional

Recommendation = Literal["hire", "no_hire", "maybe"]


class InterviewEmployeeMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    code: Optional[str] = None


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
    employee: Optional[InterviewEmployeeMini] = None


class InterviewFeedbackSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    interview_id: int
    author_id: int
    body: str
    recommendation: Optional[Recommendation] = None
    created_at: datetime
    author: Optional[InterviewEmployeeMini] = None


class InterviewCreate(BaseModel):
    application_id: int
    scheduled_at: datetime
    location: str = Field(..., max_length=256)
    # 1..3 interviewers, all holding a manager-category job.
    interviewer_ids: List[int] = Field(..., min_length=1, max_length=3)


class InterviewUpdate(BaseModel):
    scheduled_at: Optional[datetime] = None
    location: Optional[str] = Field(None, max_length=256)
    interviewer_ids: Optional[List[int]] = Field(None, min_length=1, max_length=3)


class InterviewSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    application_id: int
    scheduled_at: datetime
    location: str
    created_by: int
    created_at: datetime
    interviewers: List[InterviewInterviewerMini] = []
    feedbacks: List[InterviewFeedbackSchema] = []
    # Enriched by the service from the application (noload relationships).
    candidate: Optional[InterviewCandidateMini] = None
    job: Optional[InterviewJobMini] = None
    recruitment_task_id: Optional[int] = None


class InterviewFeedbackCreate(BaseModel):
    interview_id: int
    body: str
    recommendation: Optional[Recommendation] = None
