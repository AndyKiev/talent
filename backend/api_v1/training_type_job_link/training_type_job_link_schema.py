from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class TrainingTypeJobLinkBulkSet(BaseModel):
    """Replace all job links for a given training type at once."""

    job_ids: list[int]


class TrainingTypeJobLinkBulkSetForJob(BaseModel):
    """Replace all training-type links for a given job at once (reverse side)."""

    training_type_ids: list[int]


class TrainingTypeJobLink(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    training_type_id: int
    job_id: int
    created_at: datetime
    # Denormalised for convenience
    job_name: Optional[str] = None
    training_type_name: Optional[str] = None
