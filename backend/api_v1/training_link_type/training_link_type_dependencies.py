from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.training_link_type.training_link_type_schema import (
    TrainingLinkType as TrainingLinkTypeSchema,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.database.db_helper import db_helper
from backend.api_v1.training_link_type.training_link_type_repository import (
    TrainingLinkTypeRepository,
)
from backend.api_v1.training_link_type.training_link_type_service import (
    TrainingLinkTypeService,
)
from backend.auth.jwt_auth import get_current_active_auth_user


async def get_training_link_type_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> TrainingLinkTypeService:
    return TrainingLinkTypeService(
        repository=TrainingLinkTypeRepository(session=session),
        user=user,
        session=session,
    )


async def training_link_type_by_id(
    training_link_type_id: int,
    service: TrainingLinkTypeService = Depends(get_training_link_type_service),
) -> TrainingLinkTypeSchema:
    record = await service.get_by_id(training_link_type_id)
    return TrainingLinkTypeSchema.model_validate(record)
