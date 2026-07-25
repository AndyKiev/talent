from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.employee_events.employee_event.employee_event_repository import (
    EmployeeEventRepository,
)
from backend.api_v1.employee_events.employee_event.employee_event_schema import (
    EmployeeEventSchema,
)
from backend.api_v1.employee_events.employee_event.employee_event_service import (
    EmployeeEventService,
)
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_employee_event_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> EmployeeEventService:
    return EmployeeEventService(
        repository=EmployeeEventRepository(session=session),
        user=user,
        session=session,
    )


async def employee_event_by_id(
    event_id: int,
    service: EmployeeEventService = Depends(get_employee_event_service),
) -> EmployeeEventSchema:
    record = await service.get_by_id(event_id)
    return EmployeeEventSchema.model_validate(record)
