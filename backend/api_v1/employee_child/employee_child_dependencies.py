from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee_child.employee_child_schema import (
    EmployeeChild as EmployeeChildSchema,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.database.db_helper import db_helper
from backend.api_v1.employee_child.employee_child_repository import (
    EmployeeChildRepository,
)
from backend.api_v1.employee_child.employee_child_service import (
    EmployeeChildService,
)
from backend.auth.jwt_auth import get_current_active_auth_user


async def get_employee_child_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> EmployeeChildService:
    return EmployeeChildService(
        repository=EmployeeChildRepository(session=session),
        user=user,
        session=session,
    )


async def employee_child_by_id(
    employee_child_id: int,
    service: EmployeeChildService = Depends(get_employee_child_service),
) -> EmployeeChildSchema:
    record = await service.get_by_id(employee_child_id)
    return EmployeeChildSchema.model_validate(record)
