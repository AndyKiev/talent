from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.db_helper import db_helper
from backend.api_v1.hrm_scope.hrm_scope_repository import HrmScopeRepository
from backend.api_v1.hrm_scope.hrm_scope_service import HrmScopeService
from backend.api_v1.hrm_scope.hrm_scope_schema import HrmScopeSchema
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.auth.jwt_auth import get_current_active_auth_user


def get_hrm_scope_repository(
    session: AsyncSession = Depends(db_helper.session_getter),
) -> HrmScopeRepository:
    return HrmScopeRepository(session=session)


def get_hrm_scope_service(
    repository: HrmScopeRepository = Depends(get_hrm_scope_repository),
    user: EmployeeSchema = Depends(get_current_active_auth_user),
    session: AsyncSession = Depends(db_helper.session_getter),
) -> HrmScopeService:
    return HrmScopeService(repository=repository, user=user, session=session)


async def hrm_scope_by_id(
    hrm_scope_id: int,
    service: HrmScopeService = Depends(get_hrm_scope_service),
) -> HrmScopeSchema:
    return await service.get_by_id(hrm_scope_id)
