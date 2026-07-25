from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from fastapi.security import HTTPBearer

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee_events.employee_event_type.employee_event_type_dependencies import (
    employee_event_type_by_id,
    get_employee_event_type_service,
)
from backend.api_v1.employee_events.employee_event_type.employee_event_type_schema import (
    EmployeeEventType as EmployeeEventTypeSchema,
)
from backend.api_v1.employee_events.employee_event_type.employee_event_type_schema import (
    EmployeeEventTypeCreate,
    EmployeeEventTypeUpdate,
)
from backend.api_v1.employee_events.employee_event_type.employee_event_type_service import (
    EmployeeEventTypeService,
)
from backend.auth.guards import Guard
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/admin/employee_events/employee_event_types",
    tags=["Employee Event Types"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "",
    response_model=list[EmployeeEventTypeSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.EMPLOYEE_EVENT_TYPE)],
)
async def get_employee_event_types(
    service: Annotated[
        EmployeeEventTypeService, Depends(get_employee_event_type_service)
    ],
    name: str | None = None,
    sort: str | None = Query(
        None,
        description='JSON for sorting: {"field": "asc|desc"} or [{"field1": "asc"}, "field2"]',
    ),
):
    return await service.get_employee_event_types(name=name, sort=sort)


@router.get(
    "/{employee_event_type_id}",
    response_model=EmployeeEventTypeSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.EMPLOYEE_EVENT_TYPE)],
)
async def get_employee_event_type(
    record: EmployeeEventTypeSchema = Depends(employee_event_type_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[EmployeeEventTypeSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.EMPLOYEE_EVENT_TYPE)],
)
async def create_employee_event_type(
    type_in: EmployeeEventTypeCreate,
    service: Annotated[
        EmployeeEventTypeService, Depends(get_employee_event_type_service)
    ],
):
    return await service.create_employee_event_type(type_in)


@router.patch(
    "/{employee_event_type_id}",
    response_model=MutationResponse[EmployeeEventTypeSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.EMPLOYEE_EVENT_TYPE)],
)
async def update_employee_event_type(
    type_update: EmployeeEventTypeUpdate,
    record: EmployeeEventTypeSchema = Depends(employee_event_type_by_id),
    service: Annotated[
        EmployeeEventTypeService, Depends(get_employee_event_type_service)
    ] = None,
):
    return await service.update_employee_event_type(record.id, type_update)


@router.delete(
    "/{employee_event_type_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.EMPLOYEE_EVENT_TYPE)],
)
async def delete_employee_event_type(
    employee_event_type_id: int,
    service: Annotated[
        EmployeeEventTypeService, Depends(get_employee_event_type_service)
    ],
):
    await service.delete_employee_event_type(employee_event_type_id)
