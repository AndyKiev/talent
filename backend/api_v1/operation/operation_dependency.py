from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.db_helper import db_helper
from backend.api_v1.operation.operation_repository import OperationRepository
from backend.api_v1.operation.operation_service import OperationService
from backend.api_v1.operation.operation_schema import Operation as OperationSchema
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.api_v1.user.user_schema import User as UserSchema


async def get_operation_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> OperationService:
    """
    Build OperationService with session + user so that _translate() can resolve
    messages in the user's preferred language.
    """
    return OperationService(
        repository=OperationRepository(session=session),
        user=user,
        session=session,
    )


async def operation_by_id(
    operation_id: int,
    service: OperationService = Depends(get_operation_service),
) -> OperationSchema:
    """Resolve operation by ID → OperationSchema. Raises OperationNotFound (→ 404) if missing."""
    operation = await service.get_by_id(operation_id)
    return OperationSchema.model_validate(operation)
