from pydantic import BaseModel, ConfigDict, Field
from typing import Optional


class SettingValueTypeBase(BaseModel):
    key: str = Field(..., max_length=16)
    name: str = Field(..., max_length=64)
    is_active: bool = True


class SettingValueTypeCreate(SettingValueTypeBase):
    pass


class SettingValueTypeUpdate(BaseModel):
    key: Optional[str] = Field(None, max_length=16)
    name: Optional[str] = Field(None, max_length=64)
    is_active: Optional[bool] = None


class SettingValueType(SettingValueTypeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
