from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from backend.api_v1.training_type_job_category_link.training_type_job_category_link_repository import (
    TrainingTypeJobCategoryLinkRepository,
)
from backend.api_v1.training_type_job_category_link.training_type_job_category_link_service import (
    TrainingTypeJobCategoryLinkService,
)
from backend.database.db_helper import db_helper


async def get_training_type_job_category_link_service(
    session: AsyncSession = Depends(db_helper.session_getter),
) -> TrainingTypeJobCategoryLinkService:
    return TrainingTypeJobCategoryLinkService(
        repository=TrainingTypeJobCategoryLinkRepository(session=session),
        session=session,
    )
