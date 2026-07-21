from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee_mission_dimension_link.employee_mission_dimension_link_repository import (
    EmployeeMissionDimensionLinkRepository,
)
from backend.api_v1.employee_mission_dimension_link.employee_mission_dimension_link_service import (
    EmployeeMissionDimensionLinkService,
)
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_employee_mission_dimension_link_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    current_user: EmployeeSchema = Depends(get_current_active_auth_user),
) -> EmployeeMissionDimensionLinkService:
    return EmployeeMissionDimensionLinkService(
        repository=EmployeeMissionDimensionLinkRepository(session=session),
        user=current_user,
        session=session,
    )
