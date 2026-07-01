from pydantic import BaseModel, ConfigDict
from typing import Any, Optional


class UserSettingBase(BaseModel):
    employee_id: int
    app_setting_id: int
    value: Optional[Any] = None


class UserSettingCreate(UserSettingBase):
    pass


class UserSettingUpdate(BaseModel):
    # The only thing a user edits is their personal value.
    value: Optional[Any] = None


class UserSetting(UserSettingBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


class UserSettingWrite(BaseModel):
    """Body for PUT /user_settings/{key} — the personal value the user picked."""

    value: Any


class EffectiveUserSetting(BaseModel):
    """One row for the user-facing /settings page: the global default, this
    user's override (if any), the resolved effective value, and the allowed
    range for integer settings (min always 1, max = the global cap)."""

    key: str
    label_key: Optional[str] = None
    description_key: Optional[str] = None
    value_type_key: Optional[str] = None
    global_value: Optional[Any] = None
    user_value: Optional[Any] = None
    effective_value: Optional[Any] = None
    has_override: bool = False
    min_value: Optional[int] = None
    max_value: Optional[int] = None
