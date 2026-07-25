from typing import Annotated

from fastapi import APIRouter, Depends, Query

from backend.api_v1.employee_events.employee_event_change_department.employee_event_change_department_dependencies import (
    employee_event_change_department_by_id,
    get_employee_event_change_department_service,
)
from backend.api_v1.employee_events.employee_event_change_department.employee_event_change_department_schema import (
    EmployeeEventChangeDepartmentSchema,
)
from backend.api_v1.employee_events.employee_event_change_department.employee_event_change_department_service import (
    EmployeeEventChangeDepartmentService,
)
from backend.auth.jwt_auth import get_current_active_auth_user

router = APIRouter(
    prefix="/employee_event_change_departments",
    tags=["Employee Event Change Departments"],
    dependencies=[Depends(get_current_active_auth_user)],
)


@router.get("", response_model=list[EmployeeEventChangeDepartmentSchema])
async def get_employee_event_change_departments(
    service: Annotated[
        EmployeeEventChangeDepartmentService,
        Depends(get_employee_event_change_department_service),
    ],
    event_change_id: int | None = Query(
        None,
        description="Filter by parent event_change_id",
    ),
    sort: str | None = Query(
        None,
        description='JSON for sorting: {"field": "asc|desc"} or [{"field1": "asc"}, "field2"]',
    ),
):
    return await service.get_employee_event_change_departments(
        event_change_id=event_change_id,
        sort=sort,
    )


@router.get(
    "/{employee_event_change_department_id}",
    response_model=EmployeeEventChangeDepartmentSchema,
)
async def get_employee_event_change_department(
    record: EmployeeEventChangeDepartmentSchema = Depends(
        employee_event_change_department_by_id
    ),
):
    return record
