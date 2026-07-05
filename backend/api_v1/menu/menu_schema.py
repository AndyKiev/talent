from __future__ import annotations

from pydantic import BaseModel, ConfigDict
from typing import Optional


class MenuSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    key: str
    label_key: str
    path: str
    icon: Optional[str] = None
    parent_id: Optional[int] = None
    sort_order: int
    is_active: bool
