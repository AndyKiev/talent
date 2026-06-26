from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime


class DepartmentCategoryBase(BaseModel):
    name: str = Field(..., max_length=64)
    key: Optional[str] = Field(None, max_length=64)
    description: Optional[str] = Field(None, max_length=256)
    is_active: bool = True
    is_main: bool = False
    sort_order: int = 0


class DepartmentCategoryCreate(DepartmentCategoryBase):
    pass


class DepartmentCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=64)
    key: Optional[str] = Field(None, max_length=64)
    description: Optional[str] = Field(None, max_length=256)
    is_active: Optional[bool] = None
    is_main: Optional[bool] = None
    sort_order: Optional[int] = None


class DepartmentCategory(DepartmentCategoryBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
