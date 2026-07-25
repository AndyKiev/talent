from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.employee_status.employee_status_repository import (
    EmployeeStatusRepository,
)
from backend.api_v1.employee_status.employee_status_schema import (
    EmployeeStatus as EmployeeStatusSchema,
)
from backend.api_v1.employee_status.employee_status_service import EmployeeStatusService
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_employee_status_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> EmployeeStatusService:

    return EmployeeStatusService(
        repository=EmployeeStatusRepository(session=session),
        user=user,
        session=session,
    )


async def employee_status_by_id(
    employee_status_id: int,
    service: EmployeeStatusService = Depends(get_employee_status_service),
) -> EmployeeStatusSchema:
    record = await service.get_by_id(employee_status_id)
    return EmployeeStatusSchema.model_validate(record)
