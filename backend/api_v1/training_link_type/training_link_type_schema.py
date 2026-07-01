from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime


class TrainingLinkTypeBase(BaseModel):
    key: str = Field(..., max_length=32)
    description: Optional[str] = Field(None, max_length=256)


class TrainingLinkTypeCreate(TrainingLinkTypeBase):
    pass


class TrainingLinkTypeUpdate(BaseModel):
    key: Optional[str] = Field(None, max_length=32)
    description: Optional[str] = Field(None, max_length=256)


class TrainingLinkType(TrainingLinkTypeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
