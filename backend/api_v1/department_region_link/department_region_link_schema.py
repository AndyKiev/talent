from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

from backend.api_v1.region.region_schema import Region as RegionSchema


class DepartmentRegionLinkBase(BaseModel):
    department_id: int
    region_id: int
    is_active: bool = True


class DepartmentRegionLinkCreate(DepartmentRegionLinkBase):
    pass


class DepartmentRegionLinkUpdate(BaseModel):
    # Allow re-pointing a department to a different region, or toggling active.
    region_id: Optional[int] = None
    is_active: Optional[bool] = None


class DepartmentRegionLink(DepartmentRegionLinkBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    region: Optional[RegionSchema] = None
