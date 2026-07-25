from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.employee_events.employee_event_type_direction.employee_event_type_direction_repository import (
    EmployeeEventTypeDirectionRepository,
)
from backend.api_v1.employee_events.employee_event_type_direction.employee_event_type_direction_schema import (
    EmployeeEventTypeDirection as EmployeeEventTypeDirectionSchema,
)
from backend.api_v1.employee_events.employee_event_type_direction.employee_event_type_direction_service import (
    EmployeeEventTypeDirectionService,
)
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_employee_event_type_direction_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> EmployeeEventTypeDirectionService:
    return EmployeeEventTypeDirectionService(
        repository=EmployeeEventTypeDirectionRepository(session=session),
        user=user,
        session=session,
    )


async def employee_event_type_direction_by_id(
    direction_id: int,
    service: EmployeeEventTypeDirectionService = Depends(
        get_employee_event_type_direction_service
    ),
) -> EmployeeEventTypeDirectionSchema:
    record = await service.get_by_id(direction_id)
    return EmployeeEventTypeDirectionSchema.model_validate(record)
