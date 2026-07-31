from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee_fact_type.employee_fact_type_repository import (
    EmployeeFactTypeRepository,
)
from backend.api_v1.employee_fact_type.employee_fact_type_service import (
    EmployeeFactTypeService,
)
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_employee_fact_type_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    current_user: EmployeeSchema = Depends(get_current_active_auth_user),
) -> EmployeeFactTypeService:
    return EmployeeFactTypeService(
        repository=EmployeeFactTypeRepository(session=session),
        user=current_user,
        session=session,
    )
