from typing import Optional, Sequence

from sqlalchemy import desc, select
from sqlalchemy.orm import selectinload

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.msg_key.msg_key_model import MsgKey
from backend.api_v1.msg_pg.msg_model import Msg


class MsgFullRepository(BaseRepository):
    """
    Read-side repository for the MsgKey+Msg+Lang composite.
    Write operations (create/update/delete of child Msgs) use the session directly
    in the service, since they span two models with no single aggregate table.
    """

    model = MsgKey  # aggregate root for queries

    async def get_all(self, filters=None, sort=None) -> Sequence[MsgKey]:
        stmt = (
            select(MsgKey)
            .options(selectinload(MsgKey.msg).selectinload(Msg.lang_data))
            .order_by(desc(MsgKey.id))
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_by_id_full(self, msg_key_id: int) -> Optional[MsgKey]:
        stmt = (
            select(MsgKey)
            .where(MsgKey.id == msg_key_id)
            .options(selectinload(MsgKey.msg).selectinload(Msg.lang_data))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
