# backend/api_v1/planning/plan_matrix/plan_matrix_views.py
from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.security import HTTPBearer

from backend.api_v1.planning.plan_matrix.plan_matrix_dependencies import (
    get_plan_matrix_service,
)
from backend.api_v1.planning.plan_matrix.plan_matrix_schema import PlanMatrix
from backend.api_v1.planning.plan_matrix.plan_matrix_service import (
    PlanMatrixService,
)
from backend.auth.guards import Guard
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/admin/plan_matrices",
    tags=["Plan Matrixs"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "/by_session/{plan_session_id}",
    response_model=PlanMatrix,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.PLAN_SESSION)],
)
async def get_plan_matrix_by_session(
    plan_session_id: int,
    service: Annotated[PlanMatrixService, Depends(get_plan_matrix_service)],
):
    return await service.get_matrix(plan_session_id)
