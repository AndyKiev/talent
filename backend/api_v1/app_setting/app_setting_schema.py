from pydantic import BaseModel, ConfigDict, Field
from typing import Any, List, Optional


class AppSettingBase(BaseModel):
    key: str = Field(..., max_length=64)
    value: Optional[Any] = None
    value_type_id: int
    # Self-FK: a child setting hangs under a parent boolean (nested accordion).
    parent_id: Optional[int] = None
    label_key: Optional[str] = Field(None, max_length=64)
    description_key: Optional[str] = Field(None, max_length=64)
    is_active: bool = True
    # When True, employees may override this setting for themselves.
    user_overridable: bool = False
    # Multi-select option set (renders a multi-select in the settings UI).
    options_source: Optional[str] = Field(None, max_length=64)
    # When False, the setting can never be made user-overridable.
    user_override_allowed: bool = True
    # ── Visibility (same 3-mode system as Menu) ────────────────────────────
    visible_to_all_groups: bool = True
    visible_to_regular: bool = False
    group_ids: List[int] = []


class AppSettingCreate(AppSettingBase):
    pass


class AppSettingUpdate(BaseModel):
    # Value is the field developers edit most (a toggle for booleans). Use a
    # sentinel-free partial update: only fields explicitly sent are applied.
    value: Optional[Any] = None
    value_type_id: Optional[int] = None
    parent_id: Optional[int] = None
    label_key: Optional[str] = Field(None, max_length=64)
    description_key: Optional[str] = Field(None, max_length=64)
    is_active: Optional[bool] = None
    user_overridable: Optional[bool] = None
    options_source: Optional[str] = Field(None, max_length=64)
    user_override_allowed: Optional[bool] = None
    # ── Visibility (same 3-mode system as Menu) ────────────────────────────
    visible_to_all_groups: Optional[bool] = None
    visible_to_regular: Optional[bool] = None
    group_ids: Optional[List[int]] = None


class AppSetting(AppSettingBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    # Resolved from the linked value_type (see model property) so the UI knows
    # which editor (switch / number / date / json / multi-select) to render.
    value_type_key: Optional[str] = None

    @classmethod
    def from_orm_with_groups(cls, obj) -> "AppSetting":
        """Build schema from an ORM object, populating group_ids from the
        relationship (model property differs in name from the schema field)."""
        schema = cls.model_validate(obj)
        schema.group_ids = obj.allowed_group_ids
        return schema
