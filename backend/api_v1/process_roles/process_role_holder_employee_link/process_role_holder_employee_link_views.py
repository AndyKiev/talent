from fastapi import APIRouter, Depends, status, Query
from fastapi.security import HTTPBearer
from typing import Annotated, Optional, List

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.process_roles.process_role_holder_employee_link.process_role_holder_employee_link_schema import (
    ProcessRoleHolderEmployeeLink as ProcessRoleHolderEmployeeLinkSchema,
    ProcessRoleHolderEmployeeLinkCreate,
)
from backend.api_v1.process_roles.process_role_holder_employee_link.process_role_holder_employee_link_dependencies import (
    get_process_role_holder_employee_link_service,
)
from backend.api_v1.process_roles.process_role_holder_employee_link.process_role_holder_employee_link_service import (
    ProcessRoleHolderEmployeeLinkService,
)

router = APIRouter(
    prefix="/admin/process_role_holder_employees",
    tags=["Process Role Holder Employees"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get("", response_model=List[ProcessRoleHolderEmployeeLinkSchema])
async def get_links(
    service: Annotated[
        ProcessRoleHolderEmployeeLinkService,
        Depends(get_process_role_holder_employee_link_service),
    ],
    process_role_holder_id: Optional[int] = None,
    process_role_id: Optional[int] = None,
    employee_id: Optional[int] = None,
    sort: Optional[str] = Query(None, description='JSON sort, e.g. {"created_at": "desc"}'),
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
)
async def create_link(
    link_in: ProcessRoleHolderEmployeeLinkCreate,
    service: Annotated[
        ProcessRoleHolderEmployeeLinkService,
        Depends(get_process_role_holder_employee_link_service),
    ],
):
    return await service.create_link(link_in)


@router.delete("/{link_id}", status_code=status.HTTP_200_OK)
async def delete_link(
    link_id: int,
    service: Annotated[
        ProcessRoleHolderEmployeeLinkService,
        Depends(get_process_role_holder_employee_link_service),
    ],
):
    await service.delete_link(link_id)
