from typing import Any

from pydantic import BaseModel, ConfigDict


class UserSettingBase(BaseModel):
    employee_id: int
    app_setting_id: int
    value: Any | None = None


class UserSettingCreate(UserSettingBase):
    pass


class UserSettingUpdate(BaseModel):
    # The only thing a user edits is their personal value.
    value: Any | None = None


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
    label_key: str | None = None
    description_key: str | None = None
    value_type_key: str | None = None
    # Option-set name for select-driven settings (e.g. 'menus' for default_menu).
    options_source: str | None = None
    global_value: Any | None = None
    user_value: Any | None = None
    effective_value: Any | None = None
    has_override: bool = False
    min_value: int | None = None
    max_value: int | None = None
