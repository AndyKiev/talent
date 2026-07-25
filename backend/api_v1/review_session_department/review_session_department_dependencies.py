
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.review_session_department.review_session_department_repository import (
    ReviewSessionDepartmentRepository,
)
from backend.api_v1.review_session_department.review_session_department_service import (
    ReviewSessionDepartmentService,
)
from backend.database.db_helper import db_helper


async def get_review_session_department_service(
    session: AsyncSession = Depends(db_helper.session_getter),
) -> ReviewSessionDepartmentService:
    repo = ReviewSessionDepartmentRepository(session=session)
    return ReviewSessionDepartmentService(repository=repo, session=session)
