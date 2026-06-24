# backend/api_v1/essence/essence_dependencies.py
from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated

from backend.api_v1.essence.essence_repository import EssenceRepository
from backend.api_v1.essence.essence_service import EssenceService
from backend.api_v1.essence.essence_schema import EssenceSchema
from backend.database.db_helper import db_helper
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema


async def get_essence_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> EssenceService:
    """
    Build EssenceService with session + employee so that _translate() can resolve
    messages in the employee's preferred language.
    """
    return EssenceService(
        repository=EssenceRepository(session=session),
        user=user,
        session=session,
    )


async def essence_by_id(
    essence_id: int,
    service: Annotated[EssenceService, Depends(get_essence_service)],
) -> EssenceSchema:
    from backend.api_v1.essence.essence_errors import EssenceNotFound

    try:
        return await service.get_by_id(essence_id)
    except EssenceNotFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=exc.fallback)
