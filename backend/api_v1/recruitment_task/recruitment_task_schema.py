from datetime import datetime, date
from pydantic import BaseModel, ConfigDict
from typing import Optional

from backend.api_v1.recruitment_task.recruitment_task_state_machine import (
    RecruitmentTaskStatusKey,
)
from backend.api_v1.department.department_org_units import TopOrgUnit


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
    code: Optional[str] = None


class RecruitmentTaskDepartmentMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class RecruitmentTaskBase(BaseModel):
    job_id: int
    requirement_group_id: Optional[int] = None
    department_id: Optional[int] = None
    comment: Optional[str] = None
    target_deadline: Optional[date] = None


class RecruitmentTaskCreate(RecruitmentTaskBase):
    pass


class RecruitmentTaskUpdate(BaseModel):
    requirement_group_id: Optional[int] = None
    department_id: Optional[int] = None
    comment: Optional[str] = None
    target_deadline: Optional[date] = None


class RecruitmentTaskStatusChange(BaseModel):
    status_key: RecruitmentTaskStatusKey


class RecruitmentTaskSchema(RecruitmentTaskBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    status_id: int
    created_by: int
    created_at: datetime
    in_process_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    job: Optional[RecruitmentTaskJobMini] = None
    status: Optional[RecruitmentTaskStatusMini] = None
    requirement_group: Optional[RecruitmentTaskGroupMini] = None
    creator: Optional[RecruitmentTaskCreatorMini] = None
    department: Optional[RecruitmentTaskDepartmentMini] = None
    # Derived (not an ORM column): the exact department's top-level org unit
    # (store / directorate / board), resolved in the service.
    top_org_unit: Optional[TopOrgUnit] = None
