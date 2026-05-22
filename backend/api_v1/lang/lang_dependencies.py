from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.lang.lang_model import Lang as LangModel
from backend.api_v1.lang.lang_repository import LangRepository
from backend.api_v1.lang.lang_service import LangService
from backend.database.db_helper import db_helper

async def get_lang_service(
    session: AsyncSession = Depends(db_helper.session_getter),
) -> LangService:
    return LangService(
        repository=LangRepository(session=session),
        session=session,
    )

async def lang_by_id(
    lang_id: int,
    service: LangService = Depends(get_lang_service),
) -> LangModel:
    return await service.get_by_id(lang_id)
