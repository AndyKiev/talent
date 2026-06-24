from fastapi import APIRouter, Depends, status, Query
from fastapi.security import HTTPBearer
from typing import Annotated, Optional, List

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee_events.employee_event.employee_event_schema import (
    EmployeeEventSchema,
    EmployeeEventFlat,
    EmployeeEventCreate,
    EmployeeEventUpdate,
)
from backend.api_v1.employee_events.employee_event.employee_event_dependencies import (
    get_employee_event_service,
    employee_event_by_id,
)
from backend.api_v1.employee_events.employee_event.employee_event_service import (
    EmployeeEventService,
)
from backend.auth.guards import Guard
from backend.utils.enums import OperationVerb, EssenceName

# ── Router nested under /employees/{employee_id}/events ───────────────────────
# Mount this router on the employee router with prefix="/employees".
router = APIRouter(
    tags=["Employee Events"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "/{employee_id}/events",
    response_model=List[EmployeeEventFlat],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.EMPLOYEE_EVENT)],
)
async def get_employee_events(
    employee_id: int,
    service: Annotated[EmployeeEventService, Depends(get_employee_event_service)],
    sort: Optional[str] = Query(
        None,
        description='JSON for sorting: {"field": "asc|desc"} or [{"field1": "asc"}, "field2"]',
    ),
):
    return await service.get_employee_events(employee_id=employee_id, sort=sort)


@router.get(
    "/{employee_id}/events/{event_id}",
    response_model=EmployeeEventSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.EMPLOYEE_EVENT)],
)
async def get_employee_event(
    employee_id: int,
    record: EmployeeEventSchema = Depends(employee_event_by_id),
):
    return record


@router.post(
    "/{employee_id}/events",
    response_model=MutationResponse[EmployeeEventSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.EMPLOYEE_EVENT)],
)
async def create_employee_event(
    employee_id: int,
    event_in: EmployeeEventCreate,
    service: Annotated[EmployeeEventService, Depends(get_employee_event_service)],
):
    return await service.create_employee_event(
        employee_id=employee_id, event_in=event_in
    )


@router.patch(
    "/{employee_id}/events/{event_id}",
    response_model=MutationResponse[EmployeeEventSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.EMPLOYEE_EVENT)],
)
async def update_employee_event(
    employee_id: int,
    event_update: EmployeeEventUpdate,
    record: EmployeeEventSchema = Depends(employee_event_by_id),
    service: Annotated[
        EmployeeEventService, Depends(get_employee_event_service)
    ] = None,
):
    return await service.update_employee_event(record.id, event_update)


@router.post(
    "/{employee_id}/events/{event_id}/apply",
    response_model=MutationResponse[EmployeeEventSchema],
    dependencies=[Guard(OperationVerb.APPROVE, EssenceName.EMPLOYEE_EVENT)],
)
async def apply_employee_event(
    employee_id: int,
    applied_status_id: int,
    record: EmployeeEventSchema = Depends(employee_event_by_id),
    service: Annotated[
        EmployeeEventService, Depends(get_employee_event_service)
    ] = None,
):
    """
    Transition a draft event to `applied`.
    `applied_status_id` must be the ID of the 'applied' row
    in `employee_event_statuses`.
    """
    return await service.apply_employee_event(record.id, applied_status_id)


@router.delete(
    "/{employee_id}/events/{event_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.EMPLOYEE_EVENT)],
)
async def delete_employee_event(
    employee_id: int,
    event_id: int,
    service: Annotated[EmployeeEventService, Depends(get_employee_event_service)],
):
    await service.delete_employee_event(event_id)
