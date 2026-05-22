# from backend.api_v1.base.base_service import BaseService
# from typing import List, Optional
from typing import Optional
from backend.api_v1.base.base_service import BaseService
from backend.api_v1.lang.lang_repository import LangRepository
from sqlalchemy.ext.asyncio import AsyncSession


class LangService(BaseService):
    def __init__(
        self,
        repository: LangRepository,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, session=session)
