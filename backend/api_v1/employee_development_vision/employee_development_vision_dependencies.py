from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee_development_vision.employee_development_vision_repository import (
    EmployeeDevelopmentVisionRepository,
)
from backend.api_v1.employee_development_vision.employee_development_vision_service import (
    EmployeeDevelopmentVisionService,
)
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_employee_development_vision_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    current_user: EmployeeSchema = Depends(get_current_active_auth_user),
) -> EmployeeDevelopmentVisionService:
    return EmployeeDevelopmentVisionService(
        repository=EmployeeDevelopmentVisionRepository(session=session),
        user=current_user,
        session=session,
    )
