from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class JobRequirementItemMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    dimension_id: int
    text: str
    sort_order: int


class JobRequirementGroupBase(BaseModel):
    job_id: int
    name: str = Field(..., max_length=128)
    is_active: bool = True


class JobRequirementGroupCreate(JobRequirementGroupBase):
    pass


class JobRequirementGroupUpdate(BaseModel):
    name: str | None = Field(None, max_length=128)
    is_active: bool | None = None


class JobRequirementGroupSchema(JobRequirementGroupBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_by: int
    created_at: datetime
    items: list[JobRequirementItemMini] = []
