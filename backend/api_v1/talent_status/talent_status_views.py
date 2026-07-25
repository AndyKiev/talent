from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from fastapi.security import HTTPBearer

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.talent_status.talent_status_dependencies import (
    get_talent_status_service,
    talent_status_by_id,
)
from backend.api_v1.talent_status.talent_status_schema import (
    TalentStatus as TalentStatusSchema,
)
from backend.api_v1.talent_status.talent_status_schema import (
    TalentStatusCreate,
    TalentStatusUpdate,
)
from backend.api_v1.talent_status.talent_status_service import TalentStatusService
from backend.auth.guards import Guard
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/admin/talent_statuses",
    tags=["Talent Statuses"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "",
    response_model=list[TalentStatusSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.TALENT_STATUS)],
)
async def get_talent_statuses(
    service: Annotated[TalentStatusService, Depends(get_talent_status_service)],
    name: str | None = None,
    is_active: bool | None = None,
    sort: str | None = Query(None, description='JSON: {"field": "asc|desc"}'),
):
    return await service.get_talent_statuses(name=name, is_active=is_active, sort=sort)


@router.get(
    "/{talent_status_id}",
    response_model=TalentStatusSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.TALENT_STATUS)],
)
async def get_talent_status(
    record: TalentStatusSchema = Depends(talent_status_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[TalentStatusSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.TALENT_STATUS)],
)
async def create_talent_status(
    status_in: TalentStatusCreate,
    service: Annotated[TalentStatusService, Depends(get_talent_status_service)],
):
    return await service.create_talent_status(status_in)


@router.patch(
    "/{talent_status_id}",
    response_model=MutationResponse[TalentStatusSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.TALENT_STATUS)],
)
async def update_talent_status(
    status_update: TalentStatusUpdate,
    record: TalentStatusSchema = Depends(talent_status_by_id),
    service: Annotated[TalentStatusService, Depends(get_talent_status_service)] = None,
):
    return await service.update_talent_status(record.id, status_update)


@router.delete(
    "/{talent_status_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.TALENT_STATUS)],
)
async def delete_talent_status(
    talent_status_id: int,
    service: Annotated[TalentStatusService, Depends(get_talent_status_service)],
):
    await service.delete_talent_status(talent_status_id)
