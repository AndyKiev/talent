from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from fastapi.security import HTTPBearer

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.planning.plan_session_status.plan_session_status_dependencies import (
    get_plan_session_status_service,
    plan_session_status_by_id,
)
from backend.api_v1.planning.plan_session_status.plan_session_status_schema import (
    PlanSessionStatus as PlanSessionStatusSchema,
)
from backend.api_v1.planning.plan_session_status.plan_session_status_schema import (
    PlanSessionStatusCreate,
    PlanSessionStatusUpdate,
)
from backend.api_v1.planning.plan_session_status.plan_session_status_service import (
    PlanSessionStatusService,
)
from backend.auth.guards import Guard
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/admin/plan_session_statuses",
    tags=["Plan Session Statuses"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "",
    response_model=list[PlanSessionStatusSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.PLAN_SESSION_STATUS)],
)
async def get_plan_session_statuses(
    service: Annotated[
        PlanSessionStatusService, Depends(get_plan_session_status_service)
    ],
    sort: str | None = Query(None, description='JSON: {"field": "asc|desc"}'),
):
    return await service.get_plan_session_statuses(sort=sort)


@router.get(
    "/{plan_session_status_id}",
    response_model=PlanSessionStatusSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.PLAN_SESSION_STATUS)],
)
async def get_plan_session_status(
    record: PlanSessionStatusSchema = Depends(plan_session_status_by_id),
):
    return record


@router.post(
    "",
    response_model=MutationResponse[PlanSessionStatusSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.PLAN_SESSION_STATUS)],
)
async def create_plan_session_status(
    status_in: PlanSessionStatusCreate,
    service: Annotated[
        PlanSessionStatusService, Depends(get_plan_session_status_service)
    ],
):
    return await service.create_plan_session_status(status_in)


@router.patch(
    "/{plan_session_status_id}",
    response_model=MutationResponse[PlanSessionStatusSchema],
    dependencies=[Guard(OperationVerb.MODIFY, EssenceName.PLAN_SESSION_STATUS)],
)
async def update_plan_session_status(
    status_update: PlanSessionStatusUpdate,
    record: PlanSessionStatusSchema = Depends(plan_session_status_by_id),
    service: Annotated[
        PlanSessionStatusService, Depends(get_plan_session_status_service)
    ] = None,
):
    return await service.update_plan_session_status(record.id, status_update)


@router.delete(
    "/{plan_session_status_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.PLAN_SESSION_STATUS)],
)
async def delete_plan_session_status(
    plan_session_status_id: int,
    service: Annotated[
        PlanSessionStatusService, Depends(get_plan_session_status_service)
    ],
):
    await service.delete_plan_session_status(plan_session_status_id)
