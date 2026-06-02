from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class JobGroupBase(BaseModel):
    name: str = Field(..., max_length=128)
    key: Optional[str] = Field(None, max_length=64)
    description: Optional[str] = Field(None, max_length=256)
    job_group_type_id: int


class JobGroupCreate(JobGroupBase):
    pass


class JobGroupUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=128)
    key: Optional[str] = Field(None, max_length=64)
    description: Optional[str] = Field(None, max_length=256)
    job_group_type_id: Optional[int] = Field(None)


class JobGroup(JobGroupBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    # Denormalised from the loaded relationship — populated in service
    job_group_type_name: Optional[str] = None
    allow_multiple: Optional[bool] = None