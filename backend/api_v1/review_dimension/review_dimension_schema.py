from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List


class ReviewDimensionCriteriaSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    text: str
    sort_order: int


class ReviewDimensionBase(BaseModel):
    name: str = Field(..., max_length=128)
    key: str = Field(..., max_length=64)
    description: Optional[str] = None
    is_active: bool = True


class ReviewDimensionCreate(ReviewDimensionBase):
    pass


class ReviewDimensionUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=128)
    key: Optional[str] = Field(None, max_length=64)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ReviewDimension(ReviewDimensionBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    criteria: List[ReviewDimensionCriteriaSchema] = []
