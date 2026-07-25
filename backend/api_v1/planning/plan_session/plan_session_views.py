from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPBearer

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.planning.plan_session.plan_session_dependencies import (
    get_plan_session_service,
    plan_session_by_id,
)
from backend.api_v1.planning.plan_session.plan_session_schema import (
    PlanSession as PlanSessionSchema,
)
from backend.api_v1.planning.plan_session.plan_session_schema import (
    PlanSessionCreate,
    PlanSessionResyncRequest,
    PlanSessionUpdate,
)
from backend.api_v1.planning.plan_session.plan_session_service import PlanSessionService
from backend.auth.guards import Guard
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/admin/plan_sessions",
    tags=["Plan Sessions"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "",
    response_model=list[PlanSessionSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.PLAN_SESSION)],
)
async def get_plan_sessions(
    service: Annotated[PlanSessionService, Depends(get_plan_session_service)],
):
    return await service.get_plan_sessions()


@router.get(
    "/{plan_session_id}",
    response_model=PlanSessionSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.PLAN_SESSION)],
)
async def get_plan_session(
    record: PlanSessionSchema = Depends(plan_session_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[PlanSessionSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.PLAN_SESSION)],
)
async def create_plan_session(
    data: PlanSessionCreate,
    service: Annotated[PlanSessionService, Depends(get_plan_session_service)],
):
    return await service.create_plan_session(data)


@router.patch(
    "/{plan_session_id}/open",
    response_model=MutationResponse[PlanSessionSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.PLAN_SESSION)],
)
async def open_plan_session(
    plan_session_id: int,
    service: Annotated[PlanSessionService, Depends(get_plan_session_service)],
):
    return await service.open_plan_session(plan_session_id)


@router.patch(
    "/{plan_session_id}/close",
    response_model=MutationResponse[PlanSessionSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.PLAN_SESSION)],
)
async def close_plan_session(
    plan_session_id: int,
    service: Annotated[PlanSessionService, Depends(get_plan_session_service)],
):
    return await service.close_plan_session(plan_session_id)


@router.patch(
    "/{plan_session_id}/revert",
    response_model=MutationResponse[PlanSessionSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.PLAN_SESSION)],
)
async def revert_plan_session(
    plan_session_id: int,
    service: Annotated[PlanSessionService, Depends(get_plan_session_service)],
):
    return await service.revert_plan_session(plan_session_id)


@router.patch(
    "/{plan_session_id}/resync",
    response_model=MutationResponse[PlanSessionSchema],
    dependencies=[Guard(OperationVerb.SYNC, EssenceName.PLAN_SESSION)],
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
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.PLAN_SESSION)],
)
async def update_plan_session(
    data: PlanSessionUpdate,
    record: PlanSessionSchema = Depends(plan_session_by_id),
    service: Annotated[PlanSessionService, Depends(get_plan_session_service)] = None,
):
    return await service.update_plan_session(record.id, data)


@router.delete(
    "/{plan_session_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.PLAN_SESSION)],
)
async def delete_plan_session(
    plan_session_id: int,
    service: Annotated[PlanSessionService, Depends(get_plan_session_service)],
):
    await service.delete_plan_session(plan_session_id)
