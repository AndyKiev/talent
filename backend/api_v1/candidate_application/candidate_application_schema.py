from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import List, Optional

from backend.api_v1.candidate_application.candidate_application_state_machine import (
    PipelineStatusKey,
)


class ApplicationCandidateMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    first_name: str
    last_name: str
    email: Optional[str] = None


class ApplicationJobMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class ApplicationTaskMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    job_id: int
    job: Optional[ApplicationJobMini] = None


class ApplicationStatusMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    sort_order: int


class ApplicationCreatorMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    code: Optional[str] = None


class ApplicationHistoryMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    status_id: int
    changed_by: int
    changed_at: datetime
    status: Optional[ApplicationStatusMini] = None
    # Filled by the service via a column lookup (model relationship is noload).
    changer: Optional[ApplicationCreatorMini] = None


class CandidateApplicationCreate(BaseModel):
    candidate_id: int
    recruitment_task_id: int


class CandidateApplicationStatusChange(BaseModel):
    status_key: PipelineStatusKey


class CandidateApplicationSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    candidate_id: int
    recruitment_task_id: int
    status_id: int
    created_by: int
    created_at: datetime
    # candidate / recruitment_task / changers are filled by the service via
    # cheap column queries (the model relationships are lazy="noload").
    candidate: Optional[ApplicationCandidateMini] = None
    recruitment_task: Optional[ApplicationTaskMini] = None
    status: Optional[ApplicationStatusMini] = None
    status_history: List[ApplicationHistoryMini] = []
