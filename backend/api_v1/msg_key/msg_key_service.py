# from backend.api_v1.base.base_service import BaseService
# from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.msg_key.msg_key_repository import MsgKeyRepository


class MsgKeyService(BaseService):
    def __init__(
        self,
        repository: MsgKeyRepository,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, session=session)
