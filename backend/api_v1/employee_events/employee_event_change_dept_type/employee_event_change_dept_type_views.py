from fastapi import APIRouter, Depends, status, Query
from fastapi.security import HTTPBearer
from typing import Annotated, Optional, List

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee_events.employee_event_change_dept_type.employee_event_change_dept_type_schema import (
    EmployeeEventChangeDeptType as EmployeeEventChangeDeptTypeSchema,
    EmployeeEventChangeDeptTypeCreate,
    EmployeeEventChangeDeptTypeUpdate,
)
from backend.api_v1.employee_events.employee_event_change_dept_type.employee_event_change_dept_type_dependencies import (
    get_employee_event_change_dept_type_service,
    employee_event_change_dept_type_by_id,
)
from backend.api_v1.employee_events.employee_event_change_dept_type.employee_event_change_dept_type_service import (
    EmployeeEventChangeDeptTypeService,
)
from backend.auth.guards import Guard
from backend.utils.enums import OperationVerb, EssenceName

router = APIRouter(
    prefix="/admin/employee_events/employee_event_change_dept_types",
    tags=["Employee Event Change Dept Types"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "",
    response_model=List[EmployeeEventChangeDeptTypeSchema],
    dependencies=[
        Guard(OperationVerb.VIEW, EssenceName.EMPLOYEE_EVENT_CHANGE_DEPT_TYPE)
    ],
)
async def get_employee_event_change_dept_types(
    service: Annotated[
        EmployeeEventChangeDeptTypeService,
        Depends(get_employee_event_change_dept_type_service),
    ],
    code: Optional[str] = None,
    sort: Optional[str] = Query(
        None,
        description='JSON for sorting: {"field": "asc|desc"} or [{"field1": "asc"}, "field2"]',
    ),
):
    return await service.get_employee_event_change_dept_types(code=code, sort=sort)


@router.get(
    "/{employee_event_change_dept_type_id}",
    response_model=EmployeeEventChangeDeptTypeSchema,
    dependencies=[
        Guard(OperationVerb.VIEW, EssenceName.EMPLOYEE_EVENT_CHANGE_DEPT_TYPE)
    ],
)
async def get_employee_event_change_dept_type(
    record: EmployeeEventChangeDeptTypeSchema = Depends(
        employee_event_change_dept_type_by_id
    ),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[EmployeeEventChangeDeptTypeSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[
        Guard(OperationVerb.CREATE, EssenceName.EMPLOYEE_EVENT_CHANGE_DEPT_TYPE)
    ],
)
async def create_employee_event_change_dept_type(
    type_in: EmployeeEventChangeDeptTypeCreate,
    service: Annotated[
        EmployeeEventChangeDeptTypeService,
        Depends(get_employee_event_change_dept_type_service),
    ],
):
    return await service.create_employee_event_change_dept_type(type_in)


@router.patch(
    "/{employee_event_change_dept_type_id}",
    response_model=MutationResponse[EmployeeEventChangeDeptTypeSchema],
    dependencies=[
        Guard(OperationVerb.MODIFY, EssenceName.EMPLOYEE_EVENT_CHANGE_DEPT_TYPE)
    ],
)
async def update_employee_event_change_dept_type(
    type_update: EmployeeEventChangeDeptTypeUpdate,
    record: EmployeeEventChangeDeptTypeSchema = Depends(
        employee_event_change_dept_type_by_id
    ),
    service: Annotated[
        EmployeeEventChangeDeptTypeService,
        Depends(get_employee_event_change_dept_type_service),
    ] = None,
):
    return await service.update_employee_event_change_dept_type(record.id, type_update)


@router.delete(
    "/{employee_event_change_dept_type_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[
        Guard(OperationVerb.DELETE, EssenceName.EMPLOYEE_EVENT_CHANGE_DEPT_TYPE)
    ],
)
async def delete_employee_event_change_dept_type(
    employee_event_change_dept_type_id: int,
    service: Annotated[
        EmployeeEventChangeDeptTypeService,
        Depends(get_employee_event_change_dept_type_service),
    ],
):
    await service.delete_employee_event_change_dept_type(
        employee_event_change_dept_type_id
    )
