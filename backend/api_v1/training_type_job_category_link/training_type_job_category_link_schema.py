from datetime import datetime

from pydantic import BaseModel, ConfigDict


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
    job_category_key: str | None = None
    training_type_name: str | None = None
