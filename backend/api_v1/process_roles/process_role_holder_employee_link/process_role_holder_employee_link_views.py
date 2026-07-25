from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.process_roles.process_role_holder_employee_link.process_role_holder_employee_link_dependencies import (
    get_process_role_holder_employee_link_service,
)
from backend.api_v1.process_roles.process_role_holder_employee_link.process_role_holder_employee_link_schema import (
    ProcessRoleHolderEmployeeLink as ProcessRoleHolderEmployeeLinkSchema,
)
from backend.api_v1.process_roles.process_role_holder_employee_link.process_role_holder_employee_link_schema import (
    ProcessRoleHolderEmployeeLinkCreate,
    ProcessRoleHolderEmployeeReorder,
)
from backend.api_v1.process_roles.process_role_holder_employee_link.process_role_holder_employee_link_service import (
    ProcessRoleHolderEmployeeLinkService,
)
from backend.auth.guards import Guard
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/admin/process_role_holder_employees",
    tags=["Process Role Holder Employees"],
    dependencies=[Depends(get_current_active_auth_user)],
)


@router.get(
    "",
    response_model=list[ProcessRoleHolderEmployeeLinkSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.PROCESS_ROLE_HOLDER)],
)
async def get_links(
    service: Annotated[
        ProcessRoleHolderEmployeeLinkService,
        Depends(get_process_role_holder_employee_link_service),
    ],
    process_role_holder_id: int | None = None,
    process_role_id: int | None = None,
    employee_id: int | None = None,
    sort: str | None = Query(
        None, description='JSON sort, e.g. {"created_at": "desc"}'
    ),
):
    return await service.get_links(
        process_role_holder_id=process_role_holder_id,
        process_role_id=process_role_id,
        employee_id=employee_id,
        sort=sort,
    )


@router.post(
    "",
    response_model=MutationResponse[ProcessRoleHolderEmployeeLinkSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.LINK, EssenceName.PROCESS_ROLE_HOLDER)],
)
async def create_link(
    link_in: ProcessRoleHolderEmployeeLinkCreate,
    service: Annotated[
        ProcessRoleHolderEmployeeLinkService,
        Depends(get_process_role_holder_employee_link_service),
    ],
):
    return await service.create_link(link_in)


@router.post(
    "/reorder",
    response_model=MutationResponse[None],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.PROCESS_ROLE_HOLDER)],
)
async def reorder_links(
    payload: ProcessRoleHolderEmployeeReorder,
    service: Annotated[
        ProcessRoleHolderEmployeeLinkService,
        Depends(get_process_role_holder_employee_link_service),
    ],
):
    return await service.set_order(payload.process_role_holder_id, payload.ordered_ids)


@router.delete(
    "/{link_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.PROCESS_ROLE_HOLDER)],
)
async def delete_link(
    link_id: int,
    service: Annotated[
        ProcessRoleHolderEmployeeLinkService,
        Depends(get_process_role_holder_employee_link_service),
    ],
):
    await service.delete_link(link_id)
