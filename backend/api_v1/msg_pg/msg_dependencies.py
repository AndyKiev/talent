from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import db_helper
from backend.api_v1.msg_pg.msg_model import Msg
from backend.api_v1.msg_pg.msg_repository import MsgRepository
from backend.api_v1.msg_pg.msg_service import MsgService


async def get_msg_service(
    session: AsyncSession = Depends(db_helper.session_getter),
) -> MsgService:
    return MsgService(MsgRepository(session=session), session)


async def msg_by_id(
    msg_id: int,
    service: MsgService = Depends(get_msg_service),
) -> Msg:
    return await service.get_by_id(msg_id)
