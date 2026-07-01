from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime


class TrainingCategoryBase(BaseModel):
    name: str = Field(..., max_length=128)
    key: str = Field(..., max_length=64)
    description: Optional[str] = Field(None, max_length=256)


class TrainingCategoryCreate(TrainingCategoryBase):
    pass


class TrainingCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=128)
    key: Optional[str] = Field(None, max_length=64)
    description: Optional[str] = Field(None, max_length=256)


class TrainingCategory(TrainingCategoryBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
