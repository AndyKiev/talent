from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.review_session_employee_dimension_type.review_session_employee_dimension_type_repository import (
    ReviewSessionEmployeeDimensionTypeRepository,
)
from backend.api_v1.review_session_employee_dimension_type.review_session_employee_dimension_type_service import (
    ReviewSessionEmployeeDimensionTypeService,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_review_session_employee_dimension_type_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    current_user: EmployeeSchema = Depends(get_current_active_auth_user),
) -> ReviewSessionEmployeeDimensionTypeService:
    return ReviewSessionEmployeeDimensionTypeService(
        repository=ReviewSessionEmployeeDimensionTypeRepository(session=session),
        user=current_user,
        session=session,
    )
