from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DepartmentTypeParentalLinkBase(BaseModel):
    child_id: int
    parent_id: int
    is_active: bool = True


class DepartmentTypeParentalLinkCreate(DepartmentTypeParentalLinkBase):
    pass


class DepartmentTypeParentalLinkUpdate(BaseModel):
    child_id: int | None = None
    parent_id: int | None = None
    is_active: bool | None = None


class DepartmentTypeParentalLink(DepartmentTypeParentalLinkBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
