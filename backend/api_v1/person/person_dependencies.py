from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.person.person_repository import PersonRepository
from backend.api_v1.person.person_schema import PersonSchema
from backend.api_v1.person.person_service import PersonService
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.database.db_helper import db_helper


async def get_person_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> PersonService:
    return PersonService(
        repository=PersonRepository(session=session),
        user=user,
        session=session,
    )


async def person_by_id(
    person_id: int,
    service: PersonService = Depends(get_person_service),
) -> PersonSchema:
    return await service.get_person(person_id)
