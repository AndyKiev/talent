from fastapi import APIRouter, Depends, Query
from fastapi.security import HTTPBearer
from typing import Annotated, Optional, List

from backend.api_v1.employee_events.employee_event_change_department.employee_event_change_department_schema import (
    EmployeeEventChangeDepartmentSchema,
)
from backend.api_v1.employee_events.employee_event_change_department.employee_event_change_department_dependencies import (
    get_employee_event_change_department_service,
    employee_event_change_department_by_id,
)
from backend.api_v1.employee_events.employee_event_change_department.employee_event_change_department_service import (
    EmployeeEventChangeDepartmentService,
)

router = APIRouter(
    prefix="/employee_event_change_departments",
    tags=["Employee Event Change Departments"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get("", response_model=List[EmployeeEventChangeDepartmentSchema])
async def get_employee_event_change_departments(
    service: Annotated[
        EmployeeEventChangeDepartmentService,
        Depends(get_employee_event_change_department_service),
    ],
    event_change_id: Optional[int] = Query(
        None,
        description="Filter by parent event_change_id",
    ),
    sort: Optional[str] = Query(
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
