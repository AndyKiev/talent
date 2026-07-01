from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class JobJobCategoryLinkSet(BaseModel):
    """Body for PUT /job_job_category_links/job/{job_id} — the upsert payload."""

    job_category_id: int


class JobJobCategoryLink(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    job_id: int
    job_category_id: int
    created_at: datetime
    # Convenience read fields (populated in the service from the relationships).
    job_name: Optional[str] = None
    job_category_key: Optional[str] = None


class JobJobCategoryClearAllResult(BaseModel):
    """Response for the deliberate bulk-clear endpoint."""

    detail: str
    deleted_count: int
