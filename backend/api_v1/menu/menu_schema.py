from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional


class MenuSchema(BaseModel):
    """Public/nav schema — minimal, returned by /menus and /menus/my."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    key: str
    label_key: str
    path: str
    icon: Optional[str] = None
    parent_id: Optional[int] = None
    sort_order: int
    is_active: bool


class MenuAdminSchema(MenuSchema):
    """Full schema for the developer menu editor — adds visibility config.

    group_ids is populated from Menu.allowed_group_ids in the service (the
    property name differs, so it is set explicitly, not via from_attributes).
    """

    visible_to_all_groups: bool = False
    visible_to_regular: bool = False
    group_ids: List[int] = []


class MenuCreate(BaseModel):
    key: str = Field(..., max_length=64)
    label_key: str = Field(..., max_length=128)
    path: str = Field(..., max_length=128)
    icon: Optional[str] = Field(None, max_length=64)
    parent_id: Optional[int] = None
    sort_order: int = 0
    is_active: bool = True
    # Visibility (see Menu model): all_groups / regular flags + specific groups.
    visible_to_all_groups: bool = False
    visible_to_regular: bool = False
    group_ids: List[int] = []


class MenuUpdate(BaseModel):
    key: Optional[str] = Field(None, max_length=64)
    label_key: Optional[str] = Field(None, max_length=128)
    path: Optional[str] = Field(None, max_length=128)
    icon: Optional[str] = Field(None, max_length=64)
    parent_id: Optional[int] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None
    visible_to_all_groups: Optional[bool] = None
    visible_to_regular: Optional[bool] = None
    group_ids: Optional[List[int]] = None
