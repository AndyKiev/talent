from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.department_type.department_type_repository import (
    DepartmentTypeRepository,
)
from backend.api_v1.department_type.department_type_schema import (
    DepartmentType as DepartmentTypeSchema,
)
from backend.api_v1.department_type.department_type_service import DepartmentTypeService
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.auth.jwt_auth import get_current_active_auth_user  # <-- corrected auth
from backend.database.db_helper import db_helper  # <-- corrected import


def get_department_type_repository(
    session: AsyncSession = Depends(db_helper.session_getter),  # <-- corrected
) -> DepartmentTypeRepository:
    return DepartmentTypeRepository(session=session)


def get_department_type_service(
    repository: DepartmentTypeRepository = Depends(get_department_type_repository),
    user: EmployeeSchema = Depends(get_current_active_auth_user),  # <-- corrected
    session: AsyncSession = Depends(db_helper.session_getter),  # <-- corrected
) -> DepartmentTypeService:
    return DepartmentTypeService(repository=repository, user=user, session=session)


async def department_type_by_id(
    department_type_id: int,
    service: DepartmentTypeService = Depends(get_department_type_service),
) -> DepartmentTypeSchema:
    return await service.get_by_id(department_type_id)
