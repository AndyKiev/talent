# backend/api_v1/essence/essence_schema.py
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class EssenceBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=128)
    description: str | None = Field(None, max_length=512)


class EssenceCreate(EssenceBase):
    pass


class EssenceUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=128)
    description: str | None = Field(None, max_length=512)


class EssenceSchema(EssenceBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    allowed_operations: list[str] = []
