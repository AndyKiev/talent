from datetime import datetime

from pydantic import BaseModel, ConfigDict

from backend.api_v1.recruitment_application.recruitment_application_state_machine import (
    RecruitmentApplicationStatusKey,
)


class ApplicationCandidateMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    first_name: str
    last_name: str
    email: str | None = None


class ApplicationJobMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class ApplicationTaskMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    job_id: int
    job: ApplicationJobMini | None = None


class ApplicationStatusMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    sort_order: int


class ApplicationCreatorMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    code: str | None = None


class ApplicationHistoryMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    status_id: int
    created_by: int
    created_at: datetime
    status: ApplicationStatusMini | None = None
    # Filled by the service via a column lookup (model relationship is noload).
    creator: ApplicationCreatorMini | None = None


class RecruitmentApplicationCreate(BaseModel):
    candidate_id: int
    recruitment_task_id: int


class RecruitmentApplicationStatusChange(BaseModel):
    status_key: RecruitmentApplicationStatusKey


class RecruitmentApplicationSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    candidate_id: int
    recruitment_task_id: int
    status_id: int
    created_by: int
    created_at: datetime
    # candidate / recruitment_task / changers are filled by the service via
    # cheap column queries (the model relationships are lazy="noload").
    candidate: ApplicationCandidateMini | None = None
    recruitment_task: ApplicationTaskMini | None = None
    status: ApplicationStatusMini | None = None
    status_history: list[ApplicationHistoryMini] = []
