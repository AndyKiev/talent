from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import db_helper
from backend.api_v1.msg_full.msg_full_repository import MsgFullRepository
from backend.api_v1.msg_full.msg_full_service import MsgFullService


async def get_msg_full_service(
    session: AsyncSession = Depends(db_helper.session_getter),
) -> MsgFullService:
    return MsgFullService(MsgFullRepository(session=session), session)
