from pydantic import BaseModel, ConfigDict, Field
from typing import Optional


class LanguageLevelBase(BaseModel):
    code: str = Field(..., max_length=8)
    label: str = Field("", max_length=64)
    hint: str = ""
    sort_order: int = 0


class LanguageLevelCreate(LanguageLevelBase):
    pass


class LanguageLevelUpdate(BaseModel):
    code: Optional[str] = Field(None, max_length=8)
    label: Optional[str] = Field(None, max_length=64)
    hint: Optional[str] = None
    sort_order: Optional[int] = None


class LanguageLevel(LanguageLevelBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
