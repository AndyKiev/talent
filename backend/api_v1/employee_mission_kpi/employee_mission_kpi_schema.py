
from pydantic import BaseModel, Field


class EmployeeMissionKpiCreate(BaseModel):
    """POST /employee_mission_kpis/mission/{mission_id}.

    `percent` is not creatable — a new KPI always starts at 0 (not yet assessed)
    and is raised through the dedicated update path, so the very first assessment
    is logged like every later one.
    """

    text: str = Field(..., min_length=1)


class EmployeeMissionKpiUpdate(BaseModel):
    """PATCH /employee_mission_kpis/{kpi_id} — partial.

    Both fields are gated by the same oversight-manager rule, and both are
    change_log'd; `changes` records which one actually moved.
    """

    text: str | None = Field(default=None, min_length=1)
    percent: int | None = Field(default=None, ge=0, le=100)
