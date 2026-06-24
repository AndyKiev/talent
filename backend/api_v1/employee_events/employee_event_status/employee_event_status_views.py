from fastapi import APIRouter, Depends, status, Query
from fastapi.security import HTTPBearer
from typing import Annotated, Optional, List

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee_events.employee_event_status.employee_event_status_schema import (
    EmployeeEventStatusSchema,
    EmployeeEventStatusCreate,
    EmployeeEventStatusUpdate,
)
from backend.api_v1.employee_events.employee_event_status.employee_event_status_dependencies import (
    get_employee_event_status_service,
    employee_event_status_by_id,
)
from backend.api_v1.employee_events.employee_event_status.employee_event_status_service import (
    EmployeeEventStatusService,
)

from backend.auth.guards import Guard
from backend.utils.enums import OperationVerb, EssenceName

router = APIRouter(
    prefix="/admin/employee_events/employee_event_statuses",
    tags=["Employee Event Statuses"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "",
    response_model=List[EmployeeEventStatusSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.EMPLOYEE_EVENT_STATUS)],
)
async def get_employee_event_statuses(
    service: Annotated[
        EmployeeEventStatusService, Depends(get_employee_event_status_service)
    ],
    name: Optional[str] = None,
    sort: Optional[str] = Query(
        None,
        description='JSON for sorting: {"field": "asc|desc"} or [{"field1": "asc"}, "field2"]',
    ),
):
    return await service.get_employee_event_statuses(name=name, sort=sort)


@router.get(
    "/{employee_event_status_id}",
    response_model=EmployeeEventStatusSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.EMPLOYEE_EVENT_STATUS)],
)
async def get_employee_event_status(
    record: EmployeeEventStatusSchema = Depends(employee_event_status_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[EmployeeEventStatusSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.EMPLOYEE_EVENT_STATUS)],
)
async def create_employee_event_status(
    status_in: EmployeeEventStatusCreate,
    service: Annotated[
        EmployeeEventStatusService, Depends(get_employee_event_status_service)
    ],
):
    return await service.create_employee_event_status(status_in)


@router.patch(
    "/{employee_event_status_id}",
    response_model=MutationResponse[EmployeeEventStatusSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.EMPLOYEE_EVENT_STATUS)],
)
async def update_employee_event_status(
    status_update: EmployeeEventStatusUpdate,
    record: EmployeeEventStatusSchema = Depends(employee_event_status_by_id),
    service: Annotated[
        EmployeeEventStatusService, Depends(get_employee_event_status_service)
    ] = None,
):
    return await service.update_employee_event_status(record.id, status_update)


@router.delete(
    "/{employee_event_status_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.EMPLOYEE_EVENT_STATUS)],
)
async def delete_employee_event_status(
    employee_event_status_id: int,
    service: Annotated[
        EmployeeEventStatusService, Depends(get_employee_event_status_service)
    ],
):
    await service.delete_employee_event_status(employee_event_status_id)
