# backend/api_v1/employee_user_group_link/employee_user_group_link_views.py
from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPBearer
from typing import Annotated, List

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee_user_group_link.employee_user_group_link_schema import (
    EmployeeUserGroupLink as EmployeeUserGroupLinkSchema,
    EmployeeUserGroupLinkCreate,
    EmployeeWithGroups,
    GroupOfType,
)
from backend.api_v1.employee_user_group_link.employee_user_group_link_dependencies import (
    get_employee_user_group_link_service,
    employee_user_group_link_by_id,
    employee_user_group_link_by_composite_key,
)
from backend.api_v1.employee_user_group_link.employee_user_group_link_service import (
    EmployeeUserGroupLinkService,
)

from backend.auth.guards import Guard
from backend.utils.enums import OperationVerb, EssenceName

router = APIRouter(
    prefix="/admin/employee_user_group_links",
    tags=["Employee–User Group Links"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


# Static paths first (declared before dynamic /{id}) ---------------------------


@router.get(
    "/employees_with_groups",
    response_model=List[EmployeeWithGroups],
    dependencies=[
        Guard(OperationVerb.VIEW, EssenceName.EMPLOYEE, EssenceName.USER_GROUP)
    ],
)
async def get_employees_with_groups(
    service: Annotated[
        EmployeeUserGroupLinkService, Depends(get_employee_user_group_link_service)
    ],
):
    """All employees enriched with email + groups-by-type for the Users grid."""
    return await service.get_employees_with_groups()


@router.get(
    "/by_employee/{employee_id}",
    response_model=List[GroupOfType],
    dependencies=[
        Guard(OperationVerb.VIEW, EssenceName.EMPLOYEE, EssenceName.USER_GROUP)
    ],
)
async def get_groups_by_employee(
    employee_id: int,
    service: Annotated[
        EmployeeUserGroupLinkService, Depends(get_employee_user_group_link_service)
    ],
):
    """Groups currently attached to one employee (flattened with type)."""
    return await service.get_employee_groups(employee_id)


@router.get(
    "/by_composite_key",
    response_model=EmployeeUserGroupLinkSchema,
    dependencies=[
        Guard(OperationVerb.VIEW, EssenceName.EMPLOYEE, EssenceName.USER_GROUP)
    ],
)
async def get_link_by_composite_key(
    record: EmployeeUserGroupLinkSchema = Depends(
        employee_user_group_link_by_composite_key
    ),
):
    """Fetch one link by its unique (employee_id, user_group_id) pair."""
    return record


# Dynamic paths ----------------------------------------------------------------


@router.get(
    "/{employee_user_group_link_id}/deletion_preview",
    dependencies=[
        Guard(OperationVerb.VIEW, EssenceName.EMPLOYEE, EssenceName.USER_GROUP)
    ],
)
async def preview_link_deletion(
    employee_user_group_link_id: int,
    service: Annotated[
        EmployeeUserGroupLinkService, Depends(get_employee_user_group_link_service)
    ],
):
    """What a delete will cascade-remove (e.g. HRM scopes), for reconfirmation."""
    return await service.preview_link_deletion(employee_user_group_link_id)


@router.get(
    "/{employee_user_group_link_id}",
    response_model=EmployeeUserGroupLinkSchema,
    dependencies=[
        Guard(OperationVerb.VIEW, EssenceName.EMPLOYEE, EssenceName.USER_GROUP)
    ],
)
async def get_link(
    record: EmployeeUserGroupLinkSchema = Depends(employee_user_group_link_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[EmployeeUserGroupLinkSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[
        Guard(OperationVerb.LINK, EssenceName.EMPLOYEE, EssenceName.USER_GROUP)
    ],
)
async def create_link(
    link_in: EmployeeUserGroupLinkCreate,
    service: Annotated[
        EmployeeUserGroupLinkService, Depends(get_employee_user_group_link_service)
    ],
):
    """Assign a user group to an employee. Requires the employee to have an email."""
    return await service.create_link(link_in)


@router.delete(
    "/{employee_user_group_link_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[
        Guard(OperationVerb.LINK, EssenceName.EMPLOYEE, EssenceName.USER_GROUP)
    ],
)
async def delete_link(
    employee_user_group_link_id: int,
    service: Annotated[
        EmployeeUserGroupLinkService, Depends(get_employee_user_group_link_service)
    ],
):
    """Remove a user group from an employee."""
    await service.delete_link(employee_user_group_link_id)
