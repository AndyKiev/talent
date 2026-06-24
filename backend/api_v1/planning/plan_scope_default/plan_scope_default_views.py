from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPBearer
from typing import Annotated, List

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.planning.plan_scope_default.plan_scope_default_schema import (
    PlanScopeDefault as PlanScopeDefaultSchema,
    PlanScopeDefaultCreate,
)
from backend.api_v1.planning.plan_scope_default.plan_scope_default_dependencies import (
    get_plan_scope_default_service,
)
from backend.api_v1.planning.plan_scope_default.plan_scope_default_service import (
    PlanScopeDefaultService,
)
from backend.auth.guards import Guard
from backend.utils.enums import OperationVerb, EssenceName

router = APIRouter(
    prefix="/admin/plan_scope_defaults",
    tags=["Plan Scope Defaults"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "",
    response_model=List[PlanScopeDefaultSchema],
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.PLAN_SCOPE_DEFAULT)],
)
async def get_plan_scope_defaults(
    service: Annotated[
        PlanScopeDefaultService, Depends(get_plan_scope_default_service)
    ],
):
    return await service.get_plan_scope_defaults()


@router.post(
    "",
    response_model=MutationResponse[PlanScopeDefaultSchema],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Guard(OperationVerb.CREATE, EssenceName.PLAN_SCOPE_DEFAULT)],
)
async def create_plan_scope_default(
    data: PlanScopeDefaultCreate,
    service: Annotated[
        PlanScopeDefaultService, Depends(get_plan_scope_default_service)
    ],
):
    return await service.create_plan_scope_default(data)


@router.delete(
    "/{plan_scope_default_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Guard(OperationVerb.DELETE, EssenceName.PLAN_SCOPE_DEFAULT)],
)
async def delete_plan_scope_default(
    plan_scope_default_id: int,
    service: Annotated[
        PlanScopeDefaultService, Depends(get_plan_scope_default_service)
    ],
):
    await service.delete_plan_scope_default(plan_scope_default_id)
