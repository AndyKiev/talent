from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from backend.api_v1.department.department_org_units import TopOrgUnit
from backend.api_v1.recruitment_task.recruitment_task_state_machine import (
    RecruitmentTaskStatusKey,
)


class RecruitmentTaskJobMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    is_active: bool


class RecruitmentTaskStatusMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class RecruitmentTaskGroupMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    is_active: bool


class RecruitmentTaskCreatorMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    code: str | None = None


class RecruitmentTaskDepartmentMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class RecruitmentTaskBase(BaseModel):
    job_id: int
    requirement_group_id: int | None = None
    department_id: int | None = None
    openings: int = Field(1, ge=1)
    comment: str | None = None
    target_deadline: date | None = None


class RecruitmentTaskCreate(RecruitmentTaskBase):
    pass


class RecruitmentTaskUpdate(BaseModel):
    requirement_group_id: int | None = None
    department_id: int | None = None
    openings: int | None = Field(None, ge=1)
    comment: str | None = None
    target_deadline: date | None = None


class RecruitmentTaskStatusChange(BaseModel):
    status_key: RecruitmentTaskStatusKey


class RecruitmentTaskSchema(RecruitmentTaskBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    status_id: int
    created_by: int
    created_at: datetime
    in_process_at: datetime | None = None
    closed_at: datetime | None = None
    job: RecruitmentTaskJobMini | None = None
    status: RecruitmentTaskStatusMini | None = None
    requirement_group: RecruitmentTaskGroupMini | None = None
    creator: RecruitmentTaskCreatorMini | None = None
    department: RecruitmentTaskDepartmentMini | None = None
    # Derived (not an ORM column): the exact department's top-level org unit
    # (store / directorate / board), resolved in the service.
    top_org_unit: TopOrgUnit | None = None
