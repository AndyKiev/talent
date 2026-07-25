from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.education_degree.education_degree_repository import (
    EducationDegreeRepository,
)
from backend.api_v1.education_degree.education_degree_service import (
    EducationDegreeService,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_education_degree_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> EducationDegreeService:
    return EducationDegreeService(
        repository=EducationDegreeRepository(session=session),
        user=user,
        session=session,
    )
