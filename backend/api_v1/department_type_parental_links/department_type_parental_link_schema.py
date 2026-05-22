from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime

class DepartmentTypeParentalLinkBase(BaseModel):
    child_id: int
    parent_id: int
    is_active: bool = True

class DepartmentTypeParentalLinkCreate(DepartmentTypeParentalLinkBase):
    pass

class DepartmentTypeParentalLinkUpdate(BaseModel):
    child_id: Optional[int] = None
    parent_id: Optional[int] = None
    is_active: Optional[bool] = None

class DepartmentTypeParentalLink(DepartmentTypeParentalLinkBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime

