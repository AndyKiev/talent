from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_repository import EmployeeRepository
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee.employee_service import EmployeeService
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_employee_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    employee: EmployeeSchema = Depends(get_current_active_auth_user),
) -> EmployeeService:
    return EmployeeService(
        repository=EmployeeRepository(session=session),
        user=employee,
        session=session,
    )


async def employee_by_id(
    employee_id: int,
    service: EmployeeService = Depends(get_employee_service),
) -> EmployeeSchema:
    return await service.get_by_id(employee_id)


async def employee_by_code(
    employee_code: str,
    service: EmployeeService = Depends(get_employee_service),
) -> EmployeeSchema:
    return await service.get_by_code(employee_code)
