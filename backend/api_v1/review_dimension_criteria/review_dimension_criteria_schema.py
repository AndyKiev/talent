from pydantic import BaseModel, ConfigDict, Field
from typing import Optional


class ReviewDimensionCriteriaBase(BaseModel):
    dimension_id: int
    text: str
    sort_order: int = 0


class ReviewDimensionCriteriaCreate(ReviewDimensionCriteriaBase):
    pass


class ReviewDimensionCriteriaUpdate(BaseModel):
    text: Optional[str] = None
    sort_order: Optional[int] = None


class ReviewDimensionCriteria(ReviewDimensionCriteriaBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
