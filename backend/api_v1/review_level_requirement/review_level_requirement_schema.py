
from pydantic import BaseModel, ConfigDict, Field


class ReviewLevelRequirementBase(BaseModel):
    level_id: int
    text_key: str = Field(..., max_length=128)
    sort_order: int = 0
    is_active: bool = True


class ReviewLevelRequirementCreate(ReviewLevelRequirementBase):
    # Optional inline translation text — see ReviewLevelCreate. When provided the
    # create endpoint upserts {text_key: {eng, ukr}} server-side before the row.
    text_eng: str | None = None
    text_ukr: str | None = None


class ReviewLevelRequirementUpdate(BaseModel):
    level_id: int | None = None
    text_key: str | None = Field(None, max_length=128)
    sort_order: int | None = None
    is_active: bool | None = None


class ReviewLevelRequirement(ReviewLevelRequirementBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
