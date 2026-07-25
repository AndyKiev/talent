
from pydantic import BaseModel, ConfigDict, Field


class SettingValueTypeBase(BaseModel):
    key: str = Field(..., max_length=16)
    name: str = Field(..., max_length=64)
    is_active: bool = True


class SettingValueTypeCreate(SettingValueTypeBase):
    pass


class SettingValueTypeUpdate(BaseModel):
    key: str | None = Field(None, max_length=16)
    name: str | None = Field(None, max_length=64)
    is_active: bool | None = None


class SettingValueType(SettingValueTypeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
