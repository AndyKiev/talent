# backend/api_v1/planning/plan_report/plan_report_views.py
from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.security import HTTPBearer

from backend.api_v1.planning.plan_report.plan_report_dependencies import (
    get_plan_report_service,
)
from backend.api_v1.planning.plan_report.plan_report_schema import (
    PlanReport as PlanReportSchema,
)
from backend.api_v1.planning.plan_report.plan_report_service import PlanReportService
from backend.auth.guards import Guard
from backend.utils.enums import EssenceName, OperationVerb

router = APIRouter(
    prefix="/admin/plan_reports",
    tags=["Plan Reports"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


@router.get(
    "/by_session/{plan_session_id}",
    response_model=PlanReportSchema,
    dependencies=[Guard(OperationVerb.VIEW, EssenceName.PLAN_SESSION)],
)
async def get_plan_report_by_session(
    plan_session_id: int,
    service: Annotated[PlanReportService, Depends(get_plan_report_service)],
):
    return await service.get_report(plan_session_id)
