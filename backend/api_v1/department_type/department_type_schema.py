from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime


class DepartmentTypeBase(BaseModel):
    name: str = Field(..., max_length=128)
    description: Optional[str] = Field(None, max_length=256)
    is_active: bool = True


class DepartmentTypeCreate(DepartmentTypeBase):
    pass


class DepartmentTypeUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=128)
    description: Optional[str] = Field(None, max_length=256)
    is_active: Optional[bool] = None


class DepartmentType(DepartmentTypeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime


class DepartmentTypeWithParentalLink(DepartmentTypeBase):
    """DepartmentType with parental link metadata for hierarchy queries"""
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    # Link-specific fields
    parent_id: int | None = None
    link_id: int | None = None

