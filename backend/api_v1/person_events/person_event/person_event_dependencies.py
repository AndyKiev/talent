from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.person_events.person_event.person_event_repository import (
    PersonEventRepository,
)
from backend.api_v1.person_events.person_event.person_event_service import (
    PersonEventService,
)
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_person_event_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> PersonEventService:
    return PersonEventService(
        repository=PersonEventRepository(session=session),
        user=user,
        session=session,
    )
