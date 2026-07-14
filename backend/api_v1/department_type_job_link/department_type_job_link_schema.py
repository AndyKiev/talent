from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime

from backend.api_v1.department_type.department_type_schema import (
    DepartmentType as DepartmentTypeSchema,
)
from backend.api_v1.job.job_schema import Job as JobSchema


class DepartmentTypeJobLinkBase(BaseModel):
    department_type_id: int
    job_id: int
    is_active: bool = True


class DepartmentTypeJobLinkCreate(DepartmentTypeJobLinkBase):
    pass


class DepartmentTypeJobLinkUpdate(BaseModel):
    is_active: Optional[bool] = None


class DepartmentTypeJobLink(DepartmentTypeJobLinkBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    department_type: Optional[DepartmentTypeSchema] = None
    job: Optional[JobSchema] = None


class JobWithLinkId(JobSchema):
    """
    Job schema enriched with link metadata.
    Used by the /by-department-type/{id}/jobs endpoint so the caller
    has the link_id needed to delete the relationship.
    """

    model_config = ConfigDict(from_attributes=True)
    link_id: int
    link_is_active: bool


class DepartmentTypeJobLinkBulkSync(BaseModel):
    """Batch payload: the department type's links become EXACTLY job_ids —
    missing links are created (active), links absent from the list are
    deleted. Used by the drag-and-drop linking board's batch mode."""

    department_type_id: int
    job_ids: list[int] = Field(default_factory=list)


class DepartmentTypeJobLinkBulkSyncResult(BaseModel):
    created: int
    removed: int
