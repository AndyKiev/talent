# from backend.api_v1.base.base_service import BaseService
# from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.lang.lang_repository import LangRepository


class LangService(BaseService):
    def __init__(
        self,
        repository: LangRepository,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, session=session)
