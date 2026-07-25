from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.process_roles.process_role_holder_department_link.process_role_holder_department_link_dependencies import (
    get_process_role_holder_department_link_service,
)
from backend.api_v1.process_roles.process_role_holder_department_link.process_role_holder_department_link_schema import (
    ProcessRoleHolderDepartmentLink as ProcessRoleHolderDepartmentLinkSchema,
)
from backend.api_v1.process_roles.process_role_holder_department_link.process_role_holder_department_link_schema import (
    ProcessRoleHolderDepartmentLinkCreate,
)
from backend.api_v1.process_roles.process_role_holder_department_link.process_role_holder_department_link_service import (
    ProcessRoleHolderDepartmentLinkService,
)
from backend.auth.guards import Guard
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/admin/process_role_holder_departments",
    tags=["Process Role Holder Departments"],
    dependencies=[Depends(get_current_active_auth_user)],
)


@router.get(
    "",
    response_model=list[ProcessRoleHolderDepartmentLinkSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.PROCESS_ROLE_HOLDER)],
)
async def get_department_links(
    service: Annotated[
        ProcessRoleHolderDepartmentLinkService,
        Depends(get_process_role_holder_department_link_service),
    ],
    process_role_holder_id: int | None = None,
    process_role_id: int | None = None,
    department_id: int | None = None,
    sort: str | None = Query(
        None, description='JSON sort, e.g. {"created_at": "desc"}'
    ),
):
    return await service.get_links(
        process_role_holder_id=process_role_holder_id,
        process_role_id=process_role_id,
        department_id=department_id,
        sort=sort,
    )


@router.post(
    "",
    response_model=MutationResponse[ProcessRoleHolderDepartmentLinkSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.LINK, EssenceName.PROCESS_ROLE_HOLDER)],
)
async def create_department_link(
    link_in: ProcessRoleHolderDepartmentLinkCreate,
    service: Annotated[
        ProcessRoleHolderDepartmentLinkService,
        Depends(get_process_role_holder_department_link_service),
    ],
):
    return await service.create_link(link_in)


@router.delete(
    "/{link_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.PROCESS_ROLE_HOLDER)],
)
async def delete_department_link(
    link_id: int,
    service: Annotated[
        ProcessRoleHolderDepartmentLinkService,
        Depends(get_process_role_holder_department_link_service),
    ],
):
    await service.delete_link(link_id)
