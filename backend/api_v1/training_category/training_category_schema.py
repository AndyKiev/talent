from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TrainingCategoryBase(BaseModel):
    name: str = Field(..., max_length=128)
    key: str = Field(..., max_length=64)
    description: str | None = Field(None, max_length=256)


class TrainingCategoryCreate(TrainingCategoryBase):
    pass


class TrainingCategoryUpdate(BaseModel):
    name: str | None = Field(None, max_length=128)
    key: str | None = Field(None, max_length=64)
    description: str | None = Field(None, max_length=256)


class TrainingCategory(TrainingCategoryBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
