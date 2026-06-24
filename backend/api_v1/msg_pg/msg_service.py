from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.msg_pg.msg_repository import MsgRepository


class MsgService(BaseService):
    def __init__(
        self,
        repository: MsgRepository,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, session=session)
