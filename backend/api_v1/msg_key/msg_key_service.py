# from backend.api_v1.base.base_service import BaseService
# from typing import List, Optional
from typing import Optional
from backend.api_v1.base.base_service import BaseService
from backend.api_v1.msg_key.msg_key_repository import MsgKeyRepository
from sqlalchemy.ext.asyncio import AsyncSession


class MsgKeyService(BaseService):
    def __init__(
        self,
        repository: MsgKeyRepository,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, session=session)
