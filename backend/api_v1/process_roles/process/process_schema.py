from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ProcessBase(BaseModel):
    name: str = Field(..., max_length=128)
    key: str | None = Field(None, max_length=64)
    is_active: bool = True


class ProcessCreate(ProcessBase):
    pass


class ProcessUpdate(BaseModel):
    name: str | None = Field(None, max_length=128)
    key: str | None = Field(None, max_length=64)
    is_active: bool | None = None


class Process(ProcessBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
