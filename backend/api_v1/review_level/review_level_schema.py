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
    # Optional inline translation text. When provided, the create endpoint upserts
    # the {name_key / description_key: {eng, ukr}} translation into the messages DB
    # server-side BEFORE creating the row, so the admin enters real text (not a bare
    # key) and needs no separate msg-create permission. Omitted -> behaves as before.
    name_eng: Optional[str] = None
    name_ukr: Optional[str] = None
    description_eng: Optional[str] = None
    description_ukr: Optional[str] = None


class ReviewLevelUpdate(BaseModel):
    name_key: Optional[str] = Field(None, max_length=128)
    description_key: Optional[str] = Field(None, max_length=128)
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class ReviewLevel(ReviewLevelBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    requirements: List[ReviewLevelRequirementSchema] = []
