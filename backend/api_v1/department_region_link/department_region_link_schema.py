from datetime import datetime

from pydantic import BaseModel, ConfigDict

from backend.api_v1.region.region_schema import Region as RegionSchema


class DepartmentRegionLinkBase(BaseModel):
    department_id: int
    region_id: int
    is_active: bool = True


class DepartmentRegionLinkCreate(DepartmentRegionLinkBase):
    pass


class DepartmentRegionLinkUpdate(BaseModel):
    # Allow re-pointing a department to a different region, or toggling active.
    region_id: int | None = None
    is_active: bool | None = None


class DepartmentRegionLink(DepartmentRegionLinkBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    region: RegionSchema | None = None
