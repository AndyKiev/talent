from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime


class JobCategoryBase(BaseModel):
    key: str = Field(..., max_length=64)
    description: Optional[str] = Field(None, max_length=256)
    sort_order: int = 0


class JobCategoryCreate(JobCategoryBase):
    pass


class JobCategoryUpdate(BaseModel):
    key: Optional[str] = Field(None, max_length=64)
    description: Optional[str] = Field(None, max_length=256)
    sort_order: Optional[int] = None


class JobCategory(JobCategoryBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
