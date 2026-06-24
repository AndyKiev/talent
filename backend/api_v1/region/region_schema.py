from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime

from backend.utils.enums import MoveDirection


class RegionBase(BaseModel):
    name: str = Field(..., max_length=128)
    key: str = Field(..., max_length=64)
    is_active: bool = True


class RegionCreate(RegionBase):
    # sort_order is assigned by the service (max + 10), never sent by the client.
    pass


class RegionUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=128)
    key: Optional[str] = Field(None, max_length=64)
    is_active: Optional[bool] = None


class RegionMove(BaseModel):
    direction: MoveDirection


class Region(RegionBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    sort_order: int
    created_at: datetime


class RegionSlim(BaseModel):
    """Lightweight region for embedding in other read schemas (filters)."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    key: str
    name: str
    sort_order: int
