from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List


class ReviewLevelRequirementSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    text_key: str
    sort_order: int
    is_active: bool


class ReviewLevelBase(BaseModel):
    name_key: str = Field(..., max_length=128)
    description_key: Optional[str] = Field(None, max_length=128)
    sort_order: int = 0
    is_active: bool = True


class ReviewLevelCreate(ReviewLevelBase):
    pass


class ReviewLevelUpdate(BaseModel):
    name_key: Optional[str] = Field(None, max_length=128)
    description_key: Optional[str] = Field(None, max_length=128)
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class ReviewLevel(ReviewLevelBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    requirements: List[ReviewLevelRequirementSchema] = []
