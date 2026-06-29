from pydantic import BaseModel, ConfigDict, Field
from typing import Optional


class ReviewLevelRequirementBase(BaseModel):
    level_id: int
    text_key: str = Field(..., max_length=128)
    sort_order: int = 0
    is_active: bool = True


class ReviewLevelRequirementCreate(ReviewLevelRequirementBase):
    # Optional inline translation text — see ReviewLevelCreate. When provided the
    # create endpoint upserts {text_key: {eng, ukr}} server-side before the row.
    text_eng: Optional[str] = None
    text_ukr: Optional[str] = None


class ReviewLevelRequirementUpdate(BaseModel):
    level_id: Optional[int] = None
    text_key: Optional[str] = Field(None, max_length=128)
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class ReviewLevelRequirement(ReviewLevelRequirementBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
