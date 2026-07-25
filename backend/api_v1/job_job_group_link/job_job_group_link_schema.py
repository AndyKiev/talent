from datetime import datetime

from pydantic import BaseModel, ConfigDict


class JobJobGroupLinkCreate(BaseModel):
    job_id: int
    job_group_id: int


class JobJobGroupLinkBulkSet(BaseModel):
    """Replace all job_group links for a given job at once."""

    job_group_ids: list[int]


class JobJobGroupLink(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    job_id: int
    job_group_id: int
    created_at: datetime
    # Denormalised for convenience
    job_name: str | None = None
    job_group_name: str | None = None
    job_group_type_name: str | None = None
    allow_multiple: bool | None = None
