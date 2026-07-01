from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class TrainingTypeJobCategoryLinkBulkSet(BaseModel):
    """Replace all job_category links for a given training type at once."""

    job_category_ids: list[int]


class TrainingTypeJobCategoryLink(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    training_type_id: int
    job_category_id: int
    created_at: datetime
    # Denormalised for convenience
    job_category_key: Optional[str] = None
    training_type_name: Optional[str] = None
