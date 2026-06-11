from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee_language_profile.employee_language_profile_repository import (
    EmployeeLanguageProfileRepository,
)
from backend.api_v1.employee_language_profile.employee_language_profile_service import (
    EmployeeLanguageProfileService,
)
from backend.database.db_helper import db_helper


async def get_employee_language_profile_service(
    session: AsyncSession = Depends(db_helper.session_getter),
) -> EmployeeLanguageProfileService:
    return EmployeeLanguageProfileService(
        repository=EmployeeLanguageProfileRepository(session=session), session=session
    )
