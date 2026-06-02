# backend/api_v1/operation_essence_set_link/operation_essence_set_link_repository.py
from typing import Optional, Sequence

from sqlalchemy import select
from sqlalchemy.engine import Result

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.operation_essence_set_link.operation_essence_set_link_model import (
    OperationEssenceSetLink,
)


class OperationEssenceSetLinkRepository(BaseRepository):
    model = OperationEssenceSetLink

    async def get_by_operation_and_set(
        self, operation_id: int, essence_set_id: int
    ) -> Optional[OperationEssenceSetLink]:
        stmt = select(OperationEssenceSetLink).where(
            OperationEssenceSetLink.operation_id == operation_id,
            OperationEssenceSetLink.essence_set_id == essence_set_id,
        )
        result: Result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all_links(self) -> Sequence[OperationEssenceSetLink]:
        stmt = select(OperationEssenceSetLink).order_by(OperationEssenceSetLink.id)
        result: Result = await self.session.execute(stmt)
        return result.scalars().all()
