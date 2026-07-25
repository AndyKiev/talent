from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from fastapi.security import HTTPBearer

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee_status.employee_status_dependencies import (
    employee_status_by_id,
    get_employee_status_service,
)
from backend.api_v1.employee_status.employee_status_schema import (
    EmployeeStatus as EmployeeStatusSchema,
)
from backend.api_v1.employee_status.employee_status_schema import (
    EmployeeStatusCreate,
    EmployeeStatusUpdate,
)
from backend.api_v1.employee_status.employee_status_service import EmployeeStatusService
from backend.auth.guards import Guard
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/employee_status",
    tags=["Employee Status"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "",
    response_model=list[EmployeeStatusSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.EMPLOYEE_STATUS)],
)
async def get_employee_statuses(
    service: Annotated[EmployeeStatusService, Depends(get_employee_status_service)],
    name: str | None = None,
    sort: str | None = Query(
        None,
        description='JSON for sorting: {"field": "asc|desc"} or [{"field1": "asc"}, "field2"]',
    ),
):
    return await service.get_employee_statuses(name=name, sort=sort)


@router.get(
    "/{employee_status_id}",
    response_model=EmployeeStatusSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.EMPLOYEE_STATUS)],
)
async def get_employee_status(
    record: EmployeeStatusSchema = Depends(employee_status_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[EmployeeStatusSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.EMPLOYEE_STATUS)],
)
async def create_employee_status(
    status_in: EmployeeStatusCreate,
    service: Annotated[EmployeeStatusService, Depends(get_employee_status_service)],
):
    return await service.create_employee_status(status_in)


@router.patch(
    "/{employee_status_id}",
    response_model=MutationResponse[EmployeeStatusSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.EMPLOYEE_STATUS)],
)
async def update_employee_status(
    type_update: EmployeeStatusUpdate,
    record: EmployeeStatusSchema = Depends(employee_status_by_id),
    service: Annotated[
        EmployeeStatusService, Depends(get_employee_status_service)
    ] = None,
):
    return await service.update_employee_status(record.id, type_update)


@router.delete(
    "/{employee_status_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.EMPLOYEE_STATUS)],
)
async def delete_employee_status(
    employee_status_id: int,
    service: Annotated[EmployeeStatusService, Depends(get_employee_status_service)],
):
    await service.delete_employee_status(employee_status_id)
