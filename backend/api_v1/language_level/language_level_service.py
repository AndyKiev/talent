from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.language_level.language_level_repository import (
    LanguageLevelRepository,
)


class LanguageLevelService(BaseService):
    def __init__(
        self,
        repository: LanguageLevelRepository,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, session=session)
