from pydantic import BaseModel, ConfigDict
from typing import Optional


class RecruitmentDimensionMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    color: str
    sort_order: int


class JobRequirementItemBase(BaseModel):
    group_id: int
    dimension_id: int
    text: str
    sort_order: int = 0


class JobRequirementItemCreate(JobRequirementItemBase):
    pass


class JobRequirementItemUpdate(BaseModel):
    dimension_id: Optional[int] = None
    text: Optional[str] = None
    sort_order: Optional[int] = None


class JobRequirementItemSchema(JobRequirementItemBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    dimension: Optional[RecruitmentDimensionMini] = None
