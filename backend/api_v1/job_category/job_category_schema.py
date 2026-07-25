from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class JobCategoryBase(BaseModel):
    key: str = Field(..., max_length=64)
    description: str | None = Field(None, max_length=256)
    sort_order: int = 0


class JobCategoryCreate(JobCategoryBase):
    pass


class JobCategoryUpdate(BaseModel):
    key: str | None = Field(None, max_length=64)
    description: str | None = Field(None, max_length=256)
    sort_order: int | None = None


class JobCategory(JobCategoryBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
