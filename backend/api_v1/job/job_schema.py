from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class JobBase(BaseModel):
    name: str = Field(..., max_length=128)
    short_name: str | None = Field(None, max_length=64)
    key: str | None = Field(None, max_length=64)
    is_active: bool | None = None
    description: str | None = Field(None, max_length=256)


class JobCreate(JobBase):
    pass


class JobUpdate(BaseModel):
    name: str | None = Field(None, max_length=128)
    short_name: str | None = Field(None, max_length=64)
    key: str | None = Field(None, max_length=64)
    is_active: bool | None = None
    description: str | None = Field(None, max_length=256)


class DepartmentTypeLinkInfo(BaseModel):
    """A department type linked to a job, with the link's own is_active flag."""

    model_config = ConfigDict(from_attributes=True)
    name: str
    is_active: bool


class ProcessRoleLinkInfo(BaseModel):
    """A process role linked to a job: short = role short_name (or name) for
    compact chips, full = 'process / role' for the tooltip, department_types =
    oversight-target type names (whose employees the job+role oversees)."""

    model_config = ConfigDict(from_attributes=True)
    short: str
    full: str
    department_types: list[str] = []


class Job(JobBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    groups: list[str] = []  # user group names linked to this job
    job_group_names: list[str] = []  # job group names linked to this job
    process_role_links_info: list[ProcessRoleLinkInfo] = []  # role links (short + full)
    department_type_links: list[DepartmentTypeLinkInfo] = (
        []
    )  # dept types + link is_active
    # 1:1 job category (via job_job_category_links). job_category_key is the
    # snake_case key; the frontend label = getString(snakeToCamel(key)).
    job_category_id: int | None = None
    job_category_key: str | None = None
    # Training types that recommend this job (via training_type_job_links)
    recommended_training_names: list[str] = []


class JobBulkRow(BaseModel):
    """One row from the uploaded Excel file."""

    name: str
    description: str | None = None


class JobBulkUploadResult(BaseModel):
    """Response body for POST /jobs/bulk_upload."""

    detail: str  # human-readable success message (i18n-resolved)
    inserted: list[Job] = []  # jobs that were actually created
    skipped_names: list[str] = []  # names skipped because name already existed in DB
    skipped_descriptions: list[str] = (
        []
    )  # names skipped because description already existed in DB
    inserted_count: int = 0
    skipped_count: int = 0
