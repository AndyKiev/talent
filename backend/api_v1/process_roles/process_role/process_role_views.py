from fastapi import APIRouter, Depends, status, Query
from fastapi.security import HTTPBearer
from typing import Annotated, Optional, List

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.process_roles.process_role.process_role_schema import (
    ProcessRole as ProcessRoleSchema,
    ProcessRoleCreate,
    ProcessRoleUpdate,
)
from backend.api_v1.process_roles.process_role.process_role_dependencies import (
    get_process_role_service,
    process_role_by_id,
)
from backend.api_v1.process_roles.process_role.process_role_service import (
    ProcessRoleService,
)

router = APIRouter(
    prefix="/admin/process_roles",
    tags=["Process Roles"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get("", response_model=List[ProcessRoleSchema])
async def get_process_roles(
    service: Annotated[ProcessRoleService, Depends(get_process_role_service)],
    process_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    sort: Optional[str] = Query(None, description='JSON sort, e.g. {"name": "asc"}'),
):
    return await service.get_process_roles(
        process_id=process_id, is_active=is_active, sort=sort
    )


@router.get("/{process_role_id}", response_model=ProcessRoleSchema)
async def get_process_role(
    record: ProcessRoleSchema = Depends(process_role_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[ProcessRoleSchema],
    status_code=status.HTTP_201_CREATED,
)
async def create_process_role(
    role_in: ProcessRoleCreate,
    service: Annotated[ProcessRoleService, Depends(get_process_role_service)],
):
    return await service.create_process_role(role_in)


@router.patch(
    "/{process_role_id}", response_model=MutationResponse[ProcessRoleSchema]
)
async def update_process_role(
    role_update: ProcessRoleUpdate,
    record: ProcessRoleSchema = Depends(process_role_by_id),
    service: ProcessRoleService = Depends(get_process_role_service),
):
    return await service.update_process_role(record.id, role_update)


@router.delete("/{process_role_id}", status_code=status.HTTP_200_OK)
async def delete_process_role(
    process_role_id: int,
    service: Annotated[ProcessRoleService, Depends(get_process_role_service)],
):
    await service.delete_process_role(process_role_id)
