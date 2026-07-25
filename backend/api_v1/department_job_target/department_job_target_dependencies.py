from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.department_job_target.department_job_target_repository import (
    DepartmentJobTargetRepository,
)
from backend.api_v1.department_job_target.department_job_target_service import (
    DepartmentJobTargetService,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


def get_department_job_target_repository(
    session: AsyncSession = Depends(db_helper.session_getter),
) -> DepartmentJobTargetRepository:
    return DepartmentJobTargetRepository(session=session)


def get_department_job_target_service(
    repository: DepartmentJobTargetRepository = Depends(
        get_department_job_target_repository
    ),
    user: EmployeeSchema = Depends(get_current_active_auth_user),
    session: AsyncSession = Depends(db_helper.session_getter),
) -> DepartmentJobTargetService:
    return DepartmentJobTargetService(repository=repository, user=user, session=session)


async def ensure_headcount_plan_enabled(
    service: DepartmentJobTargetService = Depends(get_department_job_target_service),
) -> None:
    """Router-level gate: every endpoint 403s while the feature switch is off."""
    await service.ensure_feature_enabled()
