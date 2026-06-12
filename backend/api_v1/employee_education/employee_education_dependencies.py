from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee_education.employee_education_schema import (
    EmployeeEducation as EmployeeEducationSchema,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.database.db_helper import db_helper
from backend.api_v1.employee_education.employee_education_repository import (
    EmployeeEducationRepository,
)
from backend.api_v1.employee_education.employee_education_service import (
    EmployeeEducationService,
)
from backend.auth.jwt_auth import get_current_active_auth_user


async def get_employee_education_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> EmployeeEducationService:
    return EmployeeEducationService(
        repository=EmployeeEducationRepository(session=session),
        user=user,
        session=session,
    )


async def employee_education_by_id(
    employee_education_id: int,
    service: EmployeeEducationService = Depends(get_employee_education_service),
) -> EmployeeEducationSchema:
    record = await service.get_by_id(employee_education_id)
    return EmployeeEducationSchema.model_validate(record)
