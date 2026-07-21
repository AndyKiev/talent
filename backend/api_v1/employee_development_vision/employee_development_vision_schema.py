from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class EmployeeDevelopmentVisionSet(BaseModel):
    """Body for PUT /employee_development_visions/employee/{employee_id}.

    There is only ever a PUT — the row is unique per employee and the repository
    upserts, so the client never has to know whether one exists yet.
    """

    text: str = Field(..., min_length=1)


class EmployeeDevelopmentVisionSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    text: str
    created_at: datetime
    updated_at: datetime
