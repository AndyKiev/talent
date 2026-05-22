from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.db_helper import db_helper
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.employee_events.employee_event_change.employee_event_change_repository import (
    EmployeeEventChangeRepository,
)
from backend.api_v1.employee_events.employee_event_change.employee_event_change_service import (
    EmployeeEventChangeService,
)
from backend.api_v1.employee_events.employee_event_change.employee_event_change_schema import (
    EmployeeEventChangeSchema,
)


async def get_employee_event_change_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> EmployeeEventChangeService:
    return EmployeeEventChangeService(
        repository=EmployeeEventChangeRepository(session=session),
        user=user,
        session=session,
    )


async def employee_event_change_by_id(
    change_id: int,
    service: EmployeeEventChangeService = Depends(get_employee_event_change_service),
) -> EmployeeEventChangeSchema:
    record = await service.get_by_id(change_id)
    return EmployeeEventChangeSchema.model_validate(record)
