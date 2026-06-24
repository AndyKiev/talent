from fastapi import APIRouter, Depends, status, Query
from fastapi.security import HTTPBearer
from typing import Annotated, Optional, List

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee_events.employee_event_type_direction.employee_event_type_direction_schema import (
    EmployeeEventTypeDirection as EmployeeEventTypeDirectionSchema,
    EmployeeEventTypeDirectionCreate,
    EmployeeEventTypeDirectionUpdate,
)
from backend.api_v1.employee_events.employee_event_type_direction.employee_event_type_direction_dependencies import (
    get_employee_event_type_direction_service,
    employee_event_type_direction_by_id,
)
from backend.api_v1.employee_events.employee_event_type_direction.employee_event_type_direction_service import (
    EmployeeEventTypeDirectionService,
)
from backend.auth.guards import Guard
from backend.utils.enums import OperationVerb, EssenceName

# Mount on the main router with prefix="/employee_event_types"
router = APIRouter(
    tags=["Employee Event Type Directions"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "/{event_type_id}/directions",
    response_model=List[EmployeeEventTypeDirectionSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.EMPLOYEE_EVENT_TYPE_DIRECTION)],
)
async def get_type_directions(
    event_type_id: int,
    service: Annotated[
        EmployeeEventTypeDirectionService,
        Depends(get_employee_event_type_direction_service),
    ],
    sort: Optional[str] = Query(
        None,
        description='JSON for sorting: {"field": "asc|desc"} or [{"field1": "asc"}, "field2"]',
    ),
):
    return await service.get_type_directions(event_type_id=event_type_id, sort=sort)


@router.get(
    "/{event_type_id}/directions/{direction_id}",
    response_model=EmployeeEventTypeDirectionSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.EMPLOYEE_EVENT_TYPE_DIRECTION)],
)
async def get_type_direction(
    event_type_id: int,
    record: EmployeeEventTypeDirectionSchema = Depends(
        employee_event_type_direction_by_id
    ),
):
    return record


@router.post(
    "/{event_type_id}/directions",
    response_model=MutationResponse[EmployeeEventTypeDirectionSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[
        Guard(OperationVerb.CREATE, EssenceName.EMPLOYEE_EVENT_TYPE_DIRECTION)
    ],
)
async def create_type_direction(
    event_type_id: int,
    direction_in: EmployeeEventTypeDirectionCreate,
    service: Annotated[
        EmployeeEventTypeDirectionService,
        Depends(get_employee_event_type_direction_service),
    ],
):
    return await service.create_type_direction(
        event_type_id=event_type_id, direction_in=direction_in
    )


@router.patch(
    "/{event_type_id}/directions/{direction_id}",
    response_model=MutationResponse[EmployeeEventTypeDirectionSchema],
    dependencies=[
        Guard(OperationVerb.MODIFY, EssenceName.EMPLOYEE_EVENT_TYPE_DIRECTION)
    ],
)
async def update_type_direction(
    event_type_id: int,
    direction_update: EmployeeEventTypeDirectionUpdate,
    record: EmployeeEventTypeDirectionSchema = Depends(
        employee_event_type_direction_by_id
    ),
    service: Annotated[
        EmployeeEventTypeDirectionService,
        Depends(get_employee_event_type_direction_service),
    ] = None,
):
    return await service.update_type_direction(record.id, direction_update)


@router.delete(
    "/{event_type_id}/directions/{direction_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[
        Guard(OperationVerb.DELETE, EssenceName.EMPLOYEE_EVENT_TYPE_DIRECTION)
    ],
)
async def delete_type_direction(
    event_type_id: int,
    direction_id: int,
    service: Annotated[
        EmployeeEventTypeDirectionService,
        Depends(get_employee_event_type_direction_service),
    ],
):
    await service.delete_type_direction(direction_id)
