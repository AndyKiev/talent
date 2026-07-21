from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee_mission_status.employee_mission_status_repository import (
    EmployeeMissionStatusRepository,
)
from backend.api_v1.employee_mission_status.employee_mission_status_service import (
    EmployeeMissionStatusService,
)
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_employee_mission_status_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    current_user: EmployeeSchema = Depends(get_current_active_auth_user),
) -> EmployeeMissionStatusService:
    return EmployeeMissionStatusService(
        repository=EmployeeMissionStatusRepository(session=session),
        user=current_user,
        session=session,
    )
