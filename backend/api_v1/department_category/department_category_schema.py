from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DepartmentCategoryBase(BaseModel):
    name: str = Field(..., max_length=64)
    key: str | None = Field(None, max_length=64)
    description: str | None = Field(None, max_length=256)
    is_active: bool = True
    is_main: bool = False
    is_responsibility: bool = False
    sort_order: int = 0


class DepartmentCategoryCreate(DepartmentCategoryBase):
    pass


class DepartmentCategoryUpdate(BaseModel):
    name: str | None = Field(None, max_length=64)
    key: str | None = Field(None, max_length=64)
    description: str | None = Field(None, max_length=256)
    is_active: bool | None = None
    is_main: bool | None = None
    is_responsibility: bool | None = None
    sort_order: int | None = None


class DepartmentCategory(DepartmentCategoryBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
