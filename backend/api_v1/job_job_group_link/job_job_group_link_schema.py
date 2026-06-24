from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


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
    job_name: Optional[str] = None
    job_group_name: Optional[str] = None
    job_group_type_name: Optional[str] = None
    allow_multiple: Optional[bool] = None
