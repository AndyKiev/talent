from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime

from backend.api_v1.department_category.department_category_schema import (
    DepartmentCategory as DepartmentCategorySchema,
)
from backend.api_v1.job.job_schema import Job as JobSchema


class JobResponsibilityCategoryLinkBase(BaseModel):
    job_id: int
    department_category_id: int
    is_active: bool = True


class JobResponsibilityCategoryLinkCreate(JobResponsibilityCategoryLinkBase):
    pass


class JobResponsibilityCategoryLinkUpdate(BaseModel):
    is_active: Optional[bool] = None


class JobResponsibilityCategoryLink(JobResponsibilityCategoryLinkBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    job: Optional[JobSchema] = None
    department_category: Optional[DepartmentCategorySchema] = None


class ResponsibilityCategoryOption(BaseModel):
    """
    A department category offered for the RESPONSIBILITY_DEPTS_CHANGE picker.
    Returned by GET /job_responsibility_category_links/by_job/{job_id}/categories.
    `is_fallback` is true when the job has no explicit links and we returned
    the is_main=false default set.
    """

    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    is_main: bool
    is_fallback: bool = False
