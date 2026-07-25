from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPBearer

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.hrm_scope.hrm_scope_dependencies import (
    get_hrm_scope_service,
    hrm_scope_by_id,
)
from backend.api_v1.hrm_scope.hrm_scope_schema import (
    HrmEmployeeRow,
    HrmScopeCreate,
    HrmScopeSchema,
    HrmScopeUpdate,
)
from backend.api_v1.hrm_scope.hrm_scope_service import HrmScopeService
from backend.auth.guards import Guard
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/admin/hrm_scopes",
    tags=["HRM Scopes"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


# Static paths first ----------------------------------------------------------


@router.get(
    "/hrm_employees",
    response_model=list[HrmEmployeeRow],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.HRM_SCOPE)],
)
async def get_hrm_employees(
    service: Annotated[HrmScopeService, Depends(get_hrm_scope_service)],
):
    """Employees holding the HRM group, with scope counts, for the grid."""
    return await service.get_hrm_employees()


@router.get(
    "/by_employee/{employee_id}",
    response_model=list[HrmScopeSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.HRM_SCOPE)],
)
async def get_scopes_by_employee(
    employee_id: int,
    service: Annotated[HrmScopeService, Depends(get_hrm_scope_service)],
):
    """All supervision-scope rows for one HRM."""
    return await service.get_employee_scopes(employee_id)


# Dynamic paths ---------------------------------------------------------------


@router.get(
    "/{hrm_scope_id}",
    response_model=HrmScopeSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.HRM_SCOPE)],
)
async def get_scope(
    record: HrmScopeSchema = Depends(hrm_scope_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[HrmScopeSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.HRM_SCOPE)],
)
async def create_scope(
    scope_in: HrmScopeCreate,
    service: Annotated[HrmScopeService, Depends(get_hrm_scope_service)],
):
    return await service.create_scope(scope_in)


@router.patch(
    "/{hrm_scope_id}",
    response_model=MutationResponse[HrmScopeSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.HRM_SCOPE)],
)
async def update_scope(
    hrm_scope_id: int,
    scope_in: HrmScopeUpdate,
    service: Annotated[HrmScopeService, Depends(get_hrm_scope_service)],
):
    return await service.update_scope(hrm_scope_id, scope_in)


@router.delete(
    "/{hrm_scope_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.HRM_SCOPE)],
)
async def delete_scope(
    hrm_scope_id: int,
    service: Annotated[HrmScopeService, Depends(get_hrm_scope_service)],
):
    await service.delete_scope(hrm_scope_id)
