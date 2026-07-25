
from pydantic import BaseModel, ConfigDict, Field


class JobGroupBase(BaseModel):
    name: str = Field(..., max_length=128)
    key: str | None = Field(None, max_length=64)
    description: str | None = Field(None, max_length=256)
    job_group_type_id: int


class JobGroupCreate(JobGroupBase):
    pass


class JobGroupUpdate(BaseModel):
    name: str | None = Field(None, max_length=128)
    key: str | None = Field(None, max_length=64)
    description: str | None = Field(None, max_length=256)
    job_group_type_id: int | None = Field(None)


class JobGroup(JobGroupBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    # Denormalised from the loaded relationship — populated in service
    job_group_type_name: str | None = None
    allow_multiple: bool | None = None
