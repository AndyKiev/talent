from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.language_level.language_level_model import LanguageLevel as LanguageLevelModel
from backend.api_v1.language_level.language_level_repository import LanguageLevelRepository
from backend.api_v1.language_level.language_level_service import LanguageLevelService
from backend.database.db_helper import db_helper


async def get_language_level_service(
    session: AsyncSession = Depends(db_helper.session_getter),
) -> LanguageLevelService:
    return LanguageLevelService(
        repository=LanguageLevelRepository(session=session), session=session
    )


async def language_level_by_id(
    language_level_id: int,
    service: LanguageLevelService = Depends(get_language_level_service),
) -> LanguageLevelModel:
    return await service.get_by_id(language_level_id)
