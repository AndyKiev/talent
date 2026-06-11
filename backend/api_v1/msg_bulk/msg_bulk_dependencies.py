# backend/api_v1/msg_bulk/msg_bulk_dependencies.py
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import db_helper
from backend.api_v1.msg_full.msg_full_repository import MsgFullRepository
from backend.api_v1.msg_bulk.msg_bulk_service import MsgBulkService


async def get_msg_bulk_service(
    session: AsyncSession = Depends(db_helper.session_getter),
) -> MsgBulkService:
    return MsgBulkService(MsgFullRepository(session=session), session)
