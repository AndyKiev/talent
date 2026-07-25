from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TrainingLinkTypeBase(BaseModel):
    key: str = Field(..., max_length=32)
    description: str | None = Field(None, max_length=256)


class TrainingLinkTypeCreate(TrainingLinkTypeBase):
    pass


class TrainingLinkTypeUpdate(BaseModel):
    key: str | None = Field(None, max_length=32)
    description: str | None = Field(None, max_length=256)


class TrainingLinkType(TrainingLinkTypeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
