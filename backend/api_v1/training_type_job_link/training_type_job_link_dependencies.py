from backend.api_v1.training_type_job_link.training_type_job_link_repository import (
    TrainingTypeJobLinkRepository,
)
from backend.api_v1.training_type_job_link.training_type_job_link_service import (
    TrainingTypeJobLinkService,
)
from backend.database.db_helper import db_helper
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession


async def get_training_type_job_link_service(
    session: AsyncSession = Depends(db_helper.session_getter),
) -> TrainingTypeJobLinkService:
    return TrainingTypeJobLinkService(
        repository=TrainingTypeJobLinkRepository(session=session), session=session
    )
