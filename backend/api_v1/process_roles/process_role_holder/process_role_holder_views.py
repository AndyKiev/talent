from fastapi import APIRouter, Depends, status, Query
from typing import Annotated, Optional, List

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.process_roles.process_role_holder.process_role_holder_schema import (
    ProcessRoleHolder as ProcessRoleHolderSchema,
    ProcessRoleHolderCreate,
)
from backend.api_v1.process_roles.process_role_holder.process_role_holder_dependencies import (
    get_process_role_holder_service,
    process_role_holder_by_id,
)
from backend.api_v1.process_roles.process_role_holder.process_role_holder_service import (
    ProcessRoleHolderService,
)
from backend.auth.jwt_auth import get_current_active_auth_user

router = APIRouter(
    prefix="/admin/process_role_holders",
    tags=["Process Role Holders"],
    dependencies=[Depends(get_current_active_auth_user)],
)


@router.get("", response_model=List[ProcessRoleHolderSchema])
async def get_holders(
    service: Annotated[
        ProcessRoleHolderService, Depends(get_process_role_holder_service)
    ],
    process_role_id: Optional[int] = None,
    holder_employee_id: Optional[int] = None,
    sort: Optional[str] = Query(
        None, description='JSON sort, e.g. {"created_at": "desc"}'
    ),
):
    return await service.get_holders(
        process_role_id=process_role_id,
        holder_employee_id=holder_employee_id,
        sort=sort,
    )


@router.get("/{process_role_holder_id}", response_model=ProcessRoleHolderSchema)
async def get_holder(
    record: ProcessRoleHolderSchema = Depends(process_role_holder_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[ProcessRoleHolderSchema],
    status_code=status.HTTP_201_CREATED,
)
async def create_holder(
    holder_in: ProcessRoleHolderCreate,
    service: Annotated[
        ProcessRoleHolderService, Depends(get_process_role_holder_service)
    ],
):
    return await service.create_holder(holder_in)


@router.delete("/{process_role_holder_id}", status_code=status.HTTP_200_OK)
async def delete_holder(
    process_role_holder_id: int,
    service: Annotated[
        ProcessRoleHolderService, Depends(get_process_role_holder_service)
    ],
):
    await service.delete_holder(process_role_holder_id)
