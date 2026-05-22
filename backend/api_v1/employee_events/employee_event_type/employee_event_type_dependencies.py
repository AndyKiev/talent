from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.db_helper import db_helper
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.employee_events.employee_event_type.employee_event_type_repository import (
    EmployeeEventTypeRepository,
)
from backend.api_v1.employee_events.employee_event_type.employee_event_type_service import (
    EmployeeEventTypeService,
)
from backend.api_v1.employee_events.employee_event_type.employee_event_type_schema import (
    EmployeeEventType as EmployeeEventTypeSchema,
)


async def get_employee_event_type_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> EmployeeEventTypeService:
    return EmployeeEventTypeService(
        repository=EmployeeEventTypeRepository(session=session),
        user=user,
        session=session,
    )


async def employee_event_type_by_id(
    employee_event_type_id: int,
    service: EmployeeEventTypeService = Depends(get_employee_event_type_service),
) -> EmployeeEventTypeSchema:
    record = await service.get_by_id(employee_event_type_id)
    return EmployeeEventTypeSchema.model_validate(record)
