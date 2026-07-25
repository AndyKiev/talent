from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.employee_events.employee_event_direction_type.employee_event_direction_type_repository import (
    EmployeeEventDirectionTypeRepository,
)
from backend.api_v1.employee_events.employee_event_direction_type.employee_event_direction_type_schema import (
    EmployeeEventDirectionType as EmployeeEventDirectionTypeSchema,
)
from backend.api_v1.employee_events.employee_event_direction_type.employee_event_direction_type_service import (
    EmployeeEventDirectionTypeService,
)
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_employee_event_direction_type_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> EmployeeEventDirectionTypeService:
    return EmployeeEventDirectionTypeService(
        repository=EmployeeEventDirectionTypeRepository(session=session),
        user=user,
        session=session,
    )


async def employee_event_direction_type_by_id(
    employee_event_direction_type_id: int,
    service: EmployeeEventDirectionTypeService = Depends(
        get_employee_event_direction_type_service
    ),
) -> EmployeeEventDirectionTypeSchema:
    record = await service.get_by_id(employee_event_direction_type_id)
    return EmployeeEventDirectionTypeSchema.model_validate(record)
