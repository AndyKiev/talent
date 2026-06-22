from pydantic import BaseModel, ConfigDict, Field
from typing import Any, Optional


class AppSettingBase(BaseModel):
    key: str = Field(..., max_length=64)
    value: Optional[Any] = None
    value_type_id: int
    label_key: Optional[str] = Field(None, max_length=64)
    description_key: Optional[str] = Field(None, max_length=64)
    is_active: bool = True


class AppSettingCreate(AppSettingBase):
    pass


class AppSettingUpdate(BaseModel):
    # Value is the field developers edit most (a toggle for booleans). Use a
    # sentinel-free partial update: only fields explicitly sent are applied.
    value: Optional[Any] = None
    value_type_id: Optional[int] = None
    label_key: Optional[str] = Field(None, max_length=64)
    description_key: Optional[str] = Field(None, max_length=64)
    is_active: Optional[bool] = None


class AppSetting(AppSettingBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    # Resolved from the linked value_type (see model property) so the UI knows
    # which editor (switch / number / date / json) to render.
    value_type_key: Optional[str] = None
