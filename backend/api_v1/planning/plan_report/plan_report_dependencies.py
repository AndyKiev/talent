# backend/api_v1/planning/plan_report/plan_report_dependencies.py
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.database.db_helper import db_helper
from backend.api_v1.planning.plan_report.plan_report_repository import (
    PlanReportRepository,
)
from backend.api_v1.planning.plan_report.plan_report_service import PlanReportService
from backend.auth.jwt_auth import get_current_active_auth_user


async def get_plan_report_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> PlanReportService:
    return PlanReportService(
        repository=PlanReportRepository(session=session),
        user=user,
        session=session,
    )
