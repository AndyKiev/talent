from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime


class JobBase(BaseModel):
    name: str = Field(..., max_length=128)
    is_active: Optional[bool] = None
    description: Optional[str] = Field(None, max_length=256)


class JobCreate(JobBase):
    pass


class JobUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=128)
    is_active: Optional[bool] = None
    description: Optional[str] = Field(None, max_length=256)


class Job(JobBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    groups: List[str] = []  # Array of employee group names linked to this job
