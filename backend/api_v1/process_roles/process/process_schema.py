from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime


class ProcessBase(BaseModel):
    name: str = Field(..., max_length=128)
    key: Optional[str] = Field(None, max_length=64)
    is_active: bool = True


class ProcessCreate(ProcessBase):
    pass


class ProcessUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=128)
    key: Optional[str] = Field(None, max_length=64)
    is_active: Optional[bool] = None


class Process(ProcessBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
