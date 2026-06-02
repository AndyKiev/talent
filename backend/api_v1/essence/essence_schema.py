# backend/api_v1/essence/essence_schema.py
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime


class EssenceBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=128)
    description: Optional[str] = Field(None, max_length=512)


class EssenceCreate(EssenceBase):
    pass


class EssenceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=128)
    description: Optional[str] = Field(None, max_length=512)


class EssenceSchema(EssenceBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    allowed_operations: List[str] = []
