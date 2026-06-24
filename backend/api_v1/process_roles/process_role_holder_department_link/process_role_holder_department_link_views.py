from fastapi import APIRouter, Depends, status, Query
from fastapi.security import HTTPBearer
from typing import Annotated, Optional, List

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.process_roles.process_role_holder_department_link.process_role_holder_department_link_schema import (
    ProcessRoleHolderDepartmentLink as ProcessRoleHolderDepartmentLinkSchema,
    ProcessRoleHolderDepartmentLinkCreate,
)
from backend.api_v1.process_roles.process_role_holder_department_link.process_role_holder_department_link_dependencies import (
    get_process_role_holder_department_link_service,
)
from backend.api_v1.process_roles.process_role_holder_department_link.process_role_holder_department_link_service import (
    ProcessRoleHolderDepartmentLinkService,
)

router = APIRouter(
    prefix="/admin/process_role_holder_departments",
    tags=["Process Role Holder Departments"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get("", response_model=List[ProcessRoleHolderDepartmentLinkSchema])
async def get_department_links(
    service: Annotated[
        ProcessRoleHolderDepartmentLinkService,
        Depends(get_process_role_holder_department_link_service),
    ],
    process_role_holder_id: Optional[int] = None,
    process_role_id: Optional[int] = None,
    department_id: Optional[int] = None,
    sort: Optional[str] = Query(
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
)
async def create_department_link(
    link_in: ProcessRoleHolderDepartmentLinkCreate,
    service: Annotated[
        ProcessRoleHolderDepartmentLinkService,
        Depends(get_process_role_holder_department_link_service),
    ],
):
    return await service.create_link(link_in)


@router.delete("/{link_id}", status_code=status.HTTP_200_OK)
async def delete_department_link(
    link_id: int,
    service: Annotated[
        ProcessRoleHolderDepartmentLinkService,
        Depends(get_process_role_holder_department_link_service),
    ],
):
    await service.delete_link(link_id)
