from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.department.department_schema import Department as DepartmentSchema
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.database.db_helper import db_helper
from backend.api_v1.department.department_repository import DepartmentRepository
from backend.api_v1.department.department_service import DepartmentService
from backend.auth.jwt_auth import get_current_active_auth_user


async def get_department_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> DepartmentService:
    return DepartmentService(
        repository=DepartmentRepository(session=session),
        user=user,
        session=session,
    )


async def department_by_id(
    department_id: int,
    service: DepartmentService = Depends(get_department_service),
) -> DepartmentSchema:
    record = await service.get_by_id(department_id)
    return DepartmentSchema.model_validate(record)
