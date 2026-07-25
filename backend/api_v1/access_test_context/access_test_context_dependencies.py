from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.access_test_context.access_test_context_repository import (
    AccessTestContextRepository,
)
from backend.api_v1.access_test_context.access_test_context_service import (
    AccessTestContextService,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_access_test_context_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> AccessTestContextService:
    return AccessTestContextService(
        repository=AccessTestContextRepository(session=session),
        user=user,
        session=session,
    )
