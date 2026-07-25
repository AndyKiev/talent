from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class AppSettingBase(BaseModel):
    key: str = Field(..., max_length=64)
    value: Any | None = None
    value_type_id: int
    # Self-FK: a child setting hangs under a parent boolean (nested accordion).
    parent_id: int | None = None
    label_key: str | None = Field(None, max_length=64)
    description_key: str | None = Field(None, max_length=64)
    is_active: bool = True
    # When True, employees may override this setting for themselves.
    user_overridable: bool = False
    # Multi-select option set (renders a multi-select in the settings UI).
    options_source: str | None = Field(None, max_length=64)
    # When False, the setting can never be made user-overridable.
    user_override_allowed: bool = True
    # ── Visibility (same 3-mode system as Menu) ────────────────────────────
    visible_to_all_groups: bool = True
    visible_to_regular: bool = False
    group_ids: list[int] = []


class AppSettingCreate(AppSettingBase):
    pass


class AppSettingUpdate(BaseModel):
    # Value is the field developers edit most (a toggle for booleans). Use a
    # sentinel-free partial update: only fields explicitly sent are applied.
    value: Any | None = None
    value_type_id: int | None = None
    parent_id: int | None = None
    label_key: str | None = Field(None, max_length=64)
    description_key: str | None = Field(None, max_length=64)
    is_active: bool | None = None
    user_overridable: bool | None = None
    options_source: str | None = Field(None, max_length=64)
    user_override_allowed: bool | None = None
    # ── Visibility (same 3-mode system as Menu) ────────────────────────────
    visible_to_all_groups: bool | None = None
    visible_to_regular: bool | None = None
    group_ids: list[int] | None = None


class AppSetting(AppSettingBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    # Resolved from the linked value_type (see model property) so the UI knows
    # which editor (switch / number / date / json / multi-select) to render.
    value_type_key: str | None = None

    @classmethod
    def from_orm_with_groups(cls, obj) -> "AppSetting":
        """Build schema from an ORM object, populating group_ids from the
        relationship (model property differs in name from the schema field)."""
        schema = cls.model_validate(obj)
        schema.group_ids = obj.allowed_group_ids
        return schema
