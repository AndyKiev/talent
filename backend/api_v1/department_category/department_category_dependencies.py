from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.department_category.department_category_repository import (
    DepartmentCategoryRepository,
)
from backend.api_v1.department_category.department_category_schema import (
    DepartmentCategory as DepartmentCategorySchema,
)
from backend.api_v1.department_category.department_category_service import (
    DepartmentCategoryService,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_department_category_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> DepartmentCategoryService:
    return DepartmentCategoryService(
        repository=DepartmentCategoryRepository(session=session),
        user=user,
        session=session,
    )


async def department_category_by_id(
    department_category_id: int,
    service: DepartmentCategoryService = Depends(get_department_category_service),
) -> DepartmentCategorySchema:
    record = await service.get_by_id(department_category_id)
    return DepartmentCategorySchema.model_validate(record)
