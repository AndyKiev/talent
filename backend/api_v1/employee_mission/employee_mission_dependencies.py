from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee_mission.employee_mission_repository import (
    EmployeeMissionRepository,
)
from backend.api_v1.employee_mission.employee_mission_service import (
    EmployeeMissionService,
)
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_employee_mission_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    current_user: EmployeeSchema = Depends(get_current_active_auth_user),
) -> EmployeeMissionService:
    return EmployeeMissionService(
        repository=EmployeeMissionRepository(session=session),
        user=current_user,
        session=session,
    )
