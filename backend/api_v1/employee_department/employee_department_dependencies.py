from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.employee_department.employee_department_repository import (
    EmployeeDepartmentRepository,
)
from backend.api_v1.employee_department.employee_department_schema import (
    EmployeeDepartmentSchema,
)
from backend.api_v1.employee_department.employee_department_service import (
    EmployeeDepartmentService,
)
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_employee_department_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> EmployeeDepartmentService:
    return EmployeeDepartmentService(
        repository=EmployeeDepartmentRepository(session=session),
        user=user,
        session=session,
    )


async def link_by_id(
    link_id: int,
    employee_id: int,
    service: EmployeeDepartmentService = Depends(get_employee_department_service),
) -> EmployeeDepartmentSchema:
    """
    Resolves a link by its own ID, scoped to the employee_id path parameter.
    Returns 404 if the link does not exist or belongs to a different employee.
    """
    return await service.get_by_id(link_id, employee_id)
