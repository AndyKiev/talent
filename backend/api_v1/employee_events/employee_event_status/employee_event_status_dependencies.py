from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.db_helper import db_helper
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.employee_events.employee_event_status.employee_event_status_repository import (
    EmployeeEventStatusRepository,
)
from backend.api_v1.employee_events.employee_event_status.employee_event_status_service import (
    EmployeeEventStatusService,
)
from backend.api_v1.employee_events.employee_event_status.employee_event_status_schema import (
    EmployeeEventStatusSchema,
)


async def get_employee_event_status_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> EmployeeEventStatusService:
    return EmployeeEventStatusService(
        repository=EmployeeEventStatusRepository(session=session),
        user=user,
        session=session,
    )


async def employee_event_status_by_id(
    employee_event_status_id: int,
    service: EmployeeEventStatusService = Depends(get_employee_event_status_service),
) -> EmployeeEventStatusSchema:
    record = await service.get_by_id(employee_event_status_id)
    return EmployeeEventStatusSchema.model_validate(record)
