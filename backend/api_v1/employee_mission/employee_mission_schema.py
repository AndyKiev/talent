from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class EmployeeMissionKpiInput(BaseModel):
    """A KPI supplied inline when creating a mission."""

    text: str = Field(..., min_length=1)


class EmployeeMissionKpiSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    mission_id: int
    text: str
    percent: int
    sort_order: int
    created_at: datetime


class EmployeeMissionCommentSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    mission_id: int
    author_employee_id: int
    text: str
    created_at: datetime
    # Filled in the service from an employee-mini lookup (never a selectin on
    # Employee — that pulls its whole 13-way graph).
    author_name: str | None = None


class EmployeeMissionCreate(BaseModel):
    """POST /employee_missions/employee/{employee_id}.

    `end_date` is absent on purpose: it is derived server-side from
    `start_date + duration_months` and never accepted from the client.

    `kpis` has min_length=1 so the "a mission must have at least one KPI" rule is
    rejected by Pydantic before any DB work happens; the delete side of the same
    rule lives in EmployeeMissionKpiService.
    """

    text: str = Field(..., min_length=1)
    start_date: date
    duration_months: int = Field(..., gt=0)
    kpis: list[EmployeeMissionKpiInput] = Field(..., min_length=1)
    # Optional competence to develop. None = no dimension link row is created.
    dimension_id: int | None = None


class EmployeeMissionUpdate(BaseModel):
    """PATCH /employee_missions/{mission_id} — partial.

    Touching `start_date` or `duration_months` makes the service recompute
    `end_date`; KPIs and the competence link have their own endpoints.
    """

    text: str | None = Field(default=None, min_length=1)
    start_date: date | None = None
    duration_months: int | None = Field(default=None, gt=0)


class EmployeeMissionSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    text: str
    start_date: date
    end_date: date
    created_at: datetime
    # Back-calculated from the period — duration is an input, not a column.
    duration_months: int = 0
    status_id: int
    status_key: str = ""

    kpis: list[EmployeeMissionKpiSchema] = []
    comments: list[EmployeeMissionCommentSchema] = []
    # Flattened from the 1:1 link table — None when the mission has no competence.
    dimension_id: int | None = None
    dimension_name: str | None = None
    dimension_color: str | None = None

    # Derived state, computed server-side so the UI and the `mission_max_active`
    # check can never disagree about what "active" means.
    is_expired: bool = False
    is_accomplished: bool = False
    is_active: bool = True
    # True when an earlier KPI value exists in the trail, so the UI only offers
    # "revert" when it would actually do something.
    can_revert: bool = False


class EmployeeMissionHistoryEntry(BaseModel):
    """One row of the mission/KPI change trail (HRM, HRS, admin, dev).

    Flattened from change_log + change_session so the UI never needs the generic
    audit endpoints, which are admin-only and would expose the whole trail.
    """

    id: int
    entity_kind: str  # 'employee_mission' | 'employee_mission_kpi'
    entity_id: int | None = None
    action: str
    changes: dict | None = None
    actor_name: str | None = None
    changed_at: datetime
    # Grouping key + label so the UI can group by mission without a second
    # request; the label survives deletion because it comes from the trail.
    mission_id: int | None = None
    mission_label: str | None = None
