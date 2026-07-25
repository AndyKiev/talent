from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class MenuSchema(BaseModel):
    """Public/nav schema — minimal, returned by /menus and /menus/my."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    key: str
    label_key: str
    path: str
    icon: str | None = None
    parent_id: int | None = None
    sort_order: int
    is_active: bool


class MenuAdminSchema(MenuSchema):
    """Full schema for the developer menu editor — adds visibility config.

    group_ids is populated from Menu.allowed_group_ids in the service (the
    property name differs, so it is set explicitly, not via from_attributes).
    """

    visible_to_all_groups: bool = False
    visible_to_regular: bool = False
    group_ids: list[int] = []


class MenuCreate(BaseModel):
    key: str = Field(..., max_length=64)
    label_key: str = Field("", max_length=128)
    path: str = Field(..., max_length=128)
    icon: str | None = Field(None, max_length=64)
    parent_id: int | None = None
    sort_order: int = 0
    is_active: bool = True
    # Visibility (see Menu model): all_groups / regular flags + specific groups.
    visible_to_all_groups: bool = False
    visible_to_regular: bool = False
    group_ids: list[int] = []


class MenuUpdate(BaseModel):
    key: str | None = Field(None, max_length=64)
    label_key: str | None = Field(None, max_length=128)
    path: str | None = Field(None, max_length=128)
    icon: str | None = Field(None, max_length=64)
    parent_id: int | None = None
    sort_order: int | None = None
    is_active: bool | None = None
    visible_to_all_groups: bool | None = None
    visible_to_regular: bool | None = None
    group_ids: list[int] | None = None
