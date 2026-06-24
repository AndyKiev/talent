from typing import Annotated
from fastapi import Depends, Path
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import db_helper
from backend.api_v1.msg_key.msg_key_service import MsgKeyService
from backend.api_v1.msg_key.msg_key_repository import MsgKeyRepository

from backend.api_v1.msg_key.msg_key_model import MsgKey


async def get_msg_key_service(
    session: AsyncSession = Depends(db_helper.session_getter),
) -> MsgKeyService:
    return MsgKeyService(MsgKeyRepository(session=session), session)


async def msg_key_by_id(
    msg_key_id: int,
    service: MsgKeyService = Depends(get_msg_key_service),
) -> MsgKey:
    return await service.get_by_id(msg_key_id)
