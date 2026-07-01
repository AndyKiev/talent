from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime


class JobBase(BaseModel):
    name: str = Field(..., max_length=128)
    short_name: Optional[str] = Field(None, max_length=64)
    key: Optional[str] = Field(None, max_length=64)
    is_active: Optional[bool] = None
    description: Optional[str] = Field(None, max_length=256)


class JobCreate(JobBase):
    pass


class JobUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=128)
    short_name: Optional[str] = Field(None, max_length=64)
    key: Optional[str] = Field(None, max_length=64)
    is_active: Optional[bool] = None
    description: Optional[str] = Field(None, max_length=256)


class DepartmentTypeLinkInfo(BaseModel):
    """A department type linked to a job, with the link's own is_active flag."""

    model_config = ConfigDict(from_attributes=True)
    name: str
    is_active: bool


class Job(JobBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    groups: List[str] = []  # user group names linked to this job
    job_group_names: List[str] = []  # job group names linked to this job
    process_role_link_names: List[str] = []  # "process_name / role_name" per link
    department_type_links: List[DepartmentTypeLinkInfo] = (
        []
    )  # dept types + link is_active
    # 1:1 job category (via job_job_category_links). job_category_key is the
    # snake_case key; the frontend label = getString(snakeToCamel(key)).
    job_category_id: Optional[int] = None
    job_category_key: Optional[str] = None
    # Training types that recommend this job (via training_type_job_links)
    recommended_training_names: List[str] = []


class JobBulkRow(BaseModel):
    """One row from the uploaded Excel file."""

    name: str
    description: Optional[str] = None


class JobBulkUploadResult(BaseModel):
    """Response body for POST /jobs/bulk_upload."""

    detail: str  # human-readable success message (i18n-resolved)
    inserted: List[Job] = []  # jobs that were actually created
    skipped_names: List[str] = []  # names skipped because name already existed in DB
    skipped_descriptions: List[str] = (
        []
    )  # names skipped because description already existed in DB
    inserted_count: int = 0
    skipped_count: int = 0
