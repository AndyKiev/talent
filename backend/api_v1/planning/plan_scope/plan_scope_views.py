from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPBearer
from typing import Annotated, List

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.planning.plan_scope.plan_scope_schema import (
    PlanScope as PlanScopeSchema,
    PlanScopeUpdate,
)
from backend.api_v1.planning.plan_scope.plan_scope_dependencies import (
    get_plan_scope_service,
    plan_scope_by_id,
)
from backend.api_v1.planning.plan_scope.plan_scope_service import PlanScopeService

router = APIRouter(
    prefix="/admin/plan_scopes",
    tags=["Plan Scopes"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get("/by_session/{plan_session_id}", response_model=List[PlanScopeSchema])
async def get_plan_scopes_by_session(
    plan_session_id: int,
    service: Annotated[PlanScopeService, Depends(get_plan_scope_service)],
):
    return await service.get_scopes_by_session(plan_session_id)


@router.get("/{plan_scope_id}", response_model=PlanScopeSchema)
async def get_plan_scope(
    record: PlanScopeSchema = Depends(plan_scope_by_id),
):
    return record


@router.patch(
    "/{plan_scope_id}",
    response_model=MutationResponse[PlanScopeSchema],
)
async def update_plan_scope(
    scope_update: PlanScopeUpdate,
    record: PlanScopeSchema = Depends(plan_scope_by_id),
    service: Annotated[PlanScopeService, Depends(get_plan_scope_service)] = None,
):
    return await service.update_plan_scope(record.id, scope_update)


@router.delete("/{plan_scope_id}", status_code=status.HTTP_200_OK)
async def delete_plan_scope(
    plan_scope_id: int,
    service: Annotated[PlanScopeService, Depends(get_plan_scope_service)],
):
    """Hard-delete a single plan scope (open sessions only). If it still matches
    the config, a later session re-sync will recreate it."""
    await service.delete_plan_scope(plan_scope_id)
