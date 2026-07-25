from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPBearer

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee_events.employee_event_change.employee_event_change_dependencies import (
    employee_event_change_by_id,
    get_employee_event_change_service,
)
from backend.api_v1.employee_events.employee_event_change.employee_event_change_schema import (
    EmployeeEventChangeCreate,
    EmployeeEventChangeSchema,
    EmployeeEventChangeUpdate,
)
from backend.api_v1.employee_events.employee_event_change.employee_event_change_service import (
    EmployeeEventChangeService,
)
from backend.auth.guards import Guard
from backend.utils.enums import EssenceName, OperationVerb

# Mount on the employee router with prefix="/employees"
router = APIRouter(
    tags=["Employee Event Changes"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "/{employee_id}/events/{event_id}/changes",
    response_model=list[EmployeeEventChangeSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.EMPLOYEE_EVENT)],
)
async def get_event_changes(
    employee_id: int,
    event_id: int,
    service: Annotated[
        EmployeeEventChangeService, Depends(get_employee_event_change_service)
    ],
):
    return await service.get_event_changes(event_id=event_id)


@router.get(
    "/{employee_id}/events/{event_id}/changes/{change_id}",
    response_model=EmployeeEventChangeSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.EMPLOYEE_EVENT)],
)
async def get_event_change(
    employee_id: int,
    event_id: int,
    record: EmployeeEventChangeSchema = Depends(employee_event_change_by_id),
):
    return record


@router.post(
    "/{employee_id}/events/{event_id}/changes",
    response_model=MutationResponse[EmployeeEventChangeSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.EMPLOYEE_EVENT)],
)
async def create_event_change(
    employee_id: int,
    event_id: int,
    change_in: EmployeeEventChangeCreate,
    service: Annotated[
        EmployeeEventChangeService, Depends(get_employee_event_change_service)
    ],
):
    return await service.create_event_change(event_id=event_id, change_in=change_in)


@router.patch(
    "/{employee_id}/events/{event_id}/changes/{change_id}",
    response_model=MutationResponse[EmployeeEventChangeSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.EMPLOYEE_EVENT)],
)
async def update_event_change(
    employee_id: int,
    event_id: int,
    change_update: EmployeeEventChangeUpdate,
    record: EmployeeEventChangeSchema = Depends(employee_event_change_by_id),
    service: Annotated[
        EmployeeEventChangeService, Depends(get_employee_event_change_service)
    ] = None,
):
    return await service.update_event_change(record.id, change_update)


@router.delete(
    "/{employee_id}/events/{event_id}/changes/{change_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.EMPLOYEE_EVENT)],
)
async def delete_event_change(
    employee_id: int,
    event_id: int,
    change_id: int,
    service: Annotated[
        EmployeeEventChangeService, Depends(get_employee_event_change_service)
    ],
):
    await service.delete_event_change(change_id)
