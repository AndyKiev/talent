from fastapi import APIRouter, Depends, status, Query
from fastapi.security import HTTPBearer
from typing import Annotated, Optional, List

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.talent_status.talent_status_schema import (
    TalentStatus as TalentStatusSchema,
    TalentStatusCreate,
    TalentStatusUpdate,
)
from backend.api_v1.talent_status.talent_status_dependencies import (
    get_talent_status_service,
    talent_status_by_id,
)
from backend.api_v1.talent_status.talent_status_service import TalentStatusService

router = APIRouter(
    prefix="/admin/talent_statuses",
    tags=["Talent Statuses"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get("", response_model=List[TalentStatusSchema])
async def get_talent_statuses(
    service: Annotated[TalentStatusService, Depends(get_talent_status_service)],
    name: Optional[str] = None,
    is_active: Optional[bool] = None,
    sort: Optional[str] = Query(None, description='JSON: {"field": "asc|desc"}'),
):
    return await service.get_talent_statuses(name=name, is_active=is_active, sort=sort)


@router.get("/{talent_status_id}", response_model=TalentStatusSchema)
async def get_talent_status(
    record: TalentStatusSchema = Depends(talent_status_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[TalentStatusSchema],
    status_code=status.HTTP_201_CREATED,
)
async def create_talent_status(
    status_in: TalentStatusCreate,
    service: Annotated[TalentStatusService, Depends(get_talent_status_service)],
):
    return await service.create_talent_status(status_in)


@router.patch(
    "/{talent_status_id}",
    response_model=MutationResponse[TalentStatusSchema],
)
async def update_talent_status(
    status_update: TalentStatusUpdate,
    record: TalentStatusSchema = Depends(talent_status_by_id),
    service: Annotated[TalentStatusService, Depends(get_talent_status_service)] = None,
):
    return await service.update_talent_status(record.id, status_update)


@router.delete("/{talent_status_id}", status_code=status.HTTP_200_OK)
async def delete_talent_status(
    talent_status_id: int,
    service: Annotated[TalentStatusService, Depends(get_talent_status_service)],
):
    await service.delete_talent_status(talent_status_id)
