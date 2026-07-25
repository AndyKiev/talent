from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.process_roles.process.process_dependencies import (
    get_process_service,
    process_by_id,
)
from backend.api_v1.process_roles.process.process_schema import (
    Process as ProcessSchema,
)
from backend.api_v1.process_roles.process.process_schema import (
    ProcessCreate,
    ProcessUpdate,
)
from backend.api_v1.process_roles.process.process_service import ProcessService
from backend.auth.guards import Guard
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/admin/processes",
    tags=["Processes"],
    dependencies=[Depends(get_current_active_auth_user)],
)


@router.get(
    "",
    response_model=list[ProcessSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.PROCESS)],
)
async def get_processes(
    service: Annotated[ProcessService, Depends(get_process_service)],
    is_active: bool | None = None,
    sort: str | None = Query(None, description='JSON sort, e.g. {"name": "asc"}'),
):
    return await service.get_processes(is_active=is_active, sort=sort)


@router.get(
    "/{process_id}",
    response_model=ProcessSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.PROCESS)],
)
async def get_process(
    record: ProcessSchema = Depends(process_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[ProcessSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.PROCESS)],
)
async def create_process(
    process_in: ProcessCreate,
    service: Annotated[ProcessService, Depends(get_process_service)],
):
    return await service.create_process(process_in)


@router.patch(
    "/{process_id}",
    response_model=MutationResponse[ProcessSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.PROCESS)],
)
async def update_process(
    process_update: ProcessUpdate,
    record: ProcessSchema = Depends(process_by_id),
    service: ProcessService = Depends(get_process_service),
):
    return await service.update_process(record.id, process_update)


@router.delete(
    "/{process_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.PROCESS)],
)
async def delete_process(
    process_id: int,
    service: Annotated[ProcessService, Depends(get_process_service)],
):
    await service.delete_process(process_id)
