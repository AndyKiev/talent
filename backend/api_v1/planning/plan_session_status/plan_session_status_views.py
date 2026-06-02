from fastapi import APIRouter, Depends, status, Query
from fastapi.security import HTTPBearer
from typing import Annotated, Optional, List

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.planning.plan_session_status.plan_session_status_schema import (
    PlanSessionStatus as PlanSessionStatusSchema,
    PlanSessionStatusCreate,
    PlanSessionStatusUpdate,
)
from backend.api_v1.planning.plan_session_status.plan_session_status_dependencies import (
    get_plan_session_status_service,
    plan_session_status_by_id,
)
from backend.api_v1.planning.plan_session_status.plan_session_status_service import (
    PlanSessionStatusService,
)

router = APIRouter(
    prefix="/admin/plan_session_statuses",
    tags=["Plan Session Statuses"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get("", response_model=List[PlanSessionStatusSchema])
async def get_plan_session_statuses(
    service: Annotated[PlanSessionStatusService, Depends(get_plan_session_status_service)],
    sort: Optional[str] = Query(None, description='JSON: {"field": "asc|desc"}'),
):
    return await service.get_plan_session_statuses(sort=sort)


@router.get("/{plan_session_status_id}", response_model=PlanSessionStatusSchema)
async def get_plan_session_status(
    record: PlanSessionStatusSchema = Depends(plan_session_status_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[PlanSessionStatusSchema],
    status_code=status.HTTP_201_CREATED,
)
async def create_plan_session_status(
    status_in: PlanSessionStatusCreate,
    service: Annotated[PlanSessionStatusService, Depends(get_plan_session_status_service)],
):
    return await service.create_plan_session_status(status_in)


@router.patch(
    "/{plan_session_status_id}",
    response_model=MutationResponse[PlanSessionStatusSchema],
)
async def update_plan_session_status(
    status_update: PlanSessionStatusUpdate,
    record: PlanSessionStatusSchema = Depends(plan_session_status_by_id),
    service: Annotated[PlanSessionStatusService, Depends(get_plan_session_status_service)] = None,
):
    return await service.update_plan_session_status(record.id, status_update)


@router.delete("/{plan_session_status_id}", status_code=status.HTTP_200_OK)
async def delete_plan_session_status(
    plan_session_status_id: int,
    service: Annotated[PlanSessionStatusService, Depends(get_plan_session_status_service)],
):
    await service.delete_plan_session_status(plan_session_status_id)
