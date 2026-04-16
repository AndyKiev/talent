from typing import Annotated
from fastapi import Depends, Path
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.db_helper import db_helper
from backend.api_v1.message.message_service import MsgKeyService
from backend.api_v1.message.message_repository import MsgKeyRepository

from backend.api_v1.message.message_model import MsgKey
# from backend.api_v1 import MsgKey


async def get_msg_key_service(
    session: AsyncSession = Depends(db_helper.session_getter),
) -> MsgKeyService:
    return MsgKeyService(MsgKeyRepository(session=session), session)


async def get_msg_key_by_id(
    msg_key_id: Annotated[int, Path],
    msg_key_service: Annotated[MsgKeyService, Depends(get_msg_key_service)],
) -> MsgKey:
    return await msg_key_service.get_single(id=msg_key_id)
