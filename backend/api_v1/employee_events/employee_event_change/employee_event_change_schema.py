from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class EmployeeEventChangeBase(BaseModel):
    direction_type_id: int
    # JOB_CHANGE
    prev_job_id: int | None = None
    new_job_id: int | None = None
    # STATUS_CHANGE
    prev_status_id: int | None = None
    new_status_id: int | None = None
    # MAIN_DEPT_CHANGE
    prev_department_id: int | None = None
    new_department_id: int | None = None


class EmployeeEventChangeCreate(EmployeeEventChangeBase):
    """
    Input for one direction-change row when creating/drafting an event.
    For RESPONSIBILITY_DEPTS_CHANGE the caller also provides `dept_changes`.
    `event_id` is set by the service from the parent event.
    """

    dept_changes: list[EmployeeEventChangeDepartmentCreate] = []


class EmployeeEventChangeUpdate(BaseModel):
    """
    Patch payload for an existing change row — only scalar FK fields
    may be updated. `direction_type_id` is immutable after creation.
    Department child rows are managed via their own nested endpoints.
    """

    prev_job_id: int | None = None
    new_job_id: int | None = None
    prev_status_id: int | None = None
    new_status_id: int | None = None
    prev_department_id: int | None = None
    new_department_id: int | None = None


class EmployeeEventChangeSchema(EmployeeEventChangeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    event_id: int
    direction_type: EmployeeEventDirectionType | None = None
    prev_job: Job | None = None
    new_job: Job | None = None
    prev_status: EmployeeStatus | None = None
    new_status: EmployeeStatus | None = None
    prev_department: DepartmentFlat | None = None
    new_department: DepartmentFlat | None = None
    dept_changes: list[EmployeeEventChangeDepartmentSchema] = []


# ── Late imports — outside TYPE_CHECKING so model_rebuild can resolve them ─────

from backend.api_v1.department.department_schema import DepartmentFlat  # noqa: E402
from backend.api_v1.employee_events.employee_event_change_department.employee_event_change_department_schema import (  # noqa: E402
    EmployeeEventChangeDepartmentCreate,
    EmployeeEventChangeDepartmentSchema,
)
from backend.api_v1.employee_events.employee_event_direction_type.employee_event_direction_type_schema import (  # noqa: E402
    EmployeeEventDirectionType,
)
from backend.api_v1.employee_status.employee_status_schema import (
    EmployeeStatus,
)
from backend.api_v1.job.job_schema import Job  # noqa: E402

EmployeeEventChangeCreate.model_rebuild()
EmployeeEventChangeSchema.model_rebuild()
