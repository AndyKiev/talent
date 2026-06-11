from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPBearer
from typing import Annotated, List

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.planning.plan_session.plan_session_schema import (
    PlanSession as PlanSessionSchema,
    PlanSessionCreate,
    PlanSessionUpdate,
    PlanSessionResyncRequest,
)
from backend.api_v1.planning.plan_session.plan_session_dependencies import (
    get_plan_session_service,
    plan_session_by_id,
)
from backend.api_v1.planning.plan_session.plan_session_service import PlanSessionService

router = APIRouter(
    prefix="/admin/plan_sessions",
    tags=["Plan Sessions"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get("", response_model=List[PlanSessionSchema])
async def get_plan_sessions(
    service: Annotated[PlanSessionService, Depends(get_plan_session_service)],
):
    return await service.get_plan_sessions()


@router.get("/{plan_session_id}", response_model=PlanSessionSchema)
async def get_plan_session(
    record: PlanSessionSchema = Depends(plan_session_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[PlanSessionSchema],
    status_code=status.HTTP_201_CREATED,
)
async def create_plan_session(
    data: PlanSessionCreate,
    service: Annotated[PlanSessionService, Depends(get_plan_session_service)],
):
    return await service.create_plan_session(data)


@router.patch(
    "/{plan_session_id}/open",
    response_model=MutationResponse[PlanSessionSchema],
)
async def open_plan_session(
    plan_session_id: int,
    service: Annotated[PlanSessionService, Depends(get_plan_session_service)],
):
    return await service.open_plan_session(plan_session_id)


@router.patch(
    "/{plan_session_id}/close",
    response_model=MutationResponse[PlanSessionSchema],
)
async def close_plan_session(
    plan_session_id: int,
    service: Annotated[PlanSessionService, Depends(get_plan_session_service)],
):
    return await service.close_plan_session(plan_session_id)


@router.patch(
    "/{plan_session_id}/revert",
    response_model=MutationResponse[PlanSessionSchema],
)
async def revert_plan_session(
    plan_session_id: int,
    service: Annotated[PlanSessionService, Depends(get_plan_session_service)],
):
    return await service.revert_plan_session(plan_session_id)


@router.patch(
    "/{plan_session_id}/resync",
    response_model=MutationResponse[PlanSessionSchema],
)
async def resync_plan_session(
    plan_session_id: int,
    service: Annotated[PlanSessionService, Depends(get_plan_session_service)],
    body: PlanSessionResyncRequest | None = None,
):
    """Reconcile an open session's scopes with current config: add new matches,
    reactivate previously-deactivated matches, soft-deactivate non-matching ones.
    Optionally add new department categories first (body.add_category_ids).
    Existing plan values are preserved."""
    add_ids = body.add_category_ids if body else None
    return await service.resync_plan_session(plan_session_id, add_category_ids=add_ids)


@router.patch(
    "/{plan_session_id}",
    response_model=MutationResponse[PlanSessionSchema],
)
async def update_plan_session(
    data: PlanSessionUpdate,
    record: PlanSessionSchema = Depends(plan_session_by_id),
    service: Annotated[PlanSessionService, Depends(get_plan_session_service)] = None,
):
    return await service.update_plan_session(record.id, data)


@router.delete("/{plan_session_id}", status_code=status.HTTP_200_OK)
async def delete_plan_session(
    plan_session_id: int,
    service: Annotated[PlanSessionService, Depends(get_plan_session_service)],
):
    await service.delete_plan_session(plan_session_id)
