from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.db_helper import db_helper
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.employee_events.employee_event_change_department.employee_event_change_department_repository import (
    EmployeeEventChangeDepartmentRepository,
)
from backend.api_v1.employee_events.employee_event_change_department.employee_event_change_department_service import (
    EmployeeEventChangeDepartmentService,
)
from backend.api_v1.employee_events.employee_event_change_department.employee_event_change_department_schema import (
    EmployeeEventChangeDepartmentSchema,
)


async def get_employee_event_change_department_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> EmployeeEventChangeDepartmentService:
    return EmployeeEventChangeDepartmentService(
        repository=EmployeeEventChangeDepartmentRepository(session=session),
        user=user,
        session=session,
    )


async def employee_event_change_department_by_id(
    employee_event_change_department_id: int,
    service: EmployeeEventChangeDepartmentService = Depends(
        get_employee_event_change_department_service
    ),
) -> EmployeeEventChangeDepartmentSchema:
    record = await service.get_by_id(employee_event_change_department_id)
    return EmployeeEventChangeDepartmentSchema.model_validate(record)
