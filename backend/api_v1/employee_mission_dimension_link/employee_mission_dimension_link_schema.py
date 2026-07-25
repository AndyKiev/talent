from datetime import datetime

from pydantic import BaseModel, ConfigDict


class EmployeeMissionDimensionLinkSet(BaseModel):
    """Body for PUT /employee_mission_dimension_links/mission/{mission_id}."""

    dimension_id: int


class EmployeeMissionDimensionLinkSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    mission_id: int
    dimension_id: int
    created_at: datetime
    # Convenience read fields, filled in the service from the relationship.
    dimension_name: str | None = None
    dimension_color: str | None = None
