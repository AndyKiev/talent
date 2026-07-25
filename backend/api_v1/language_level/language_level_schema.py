
from pydantic import BaseModel, ConfigDict, Field


class LanguageLevelBase(BaseModel):
    code: str = Field(..., max_length=8)
    label: str = Field("", max_length=64)
    hint: str = ""
    sort_order: int = 0


class LanguageLevelCreate(LanguageLevelBase):
    pass


class LanguageLevelUpdate(BaseModel):
    code: str | None = Field(None, max_length=8)
    label: str | None = Field(None, max_length=64)
    hint: str | None = None
    sort_order: int | None = None


class LanguageLevel(LanguageLevelBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
