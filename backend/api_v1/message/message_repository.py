from typing import Any, Sequence

from sqlalchemy import Row, RowMapping, and_, desc
from sqlalchemy.future import select

from backend.api_v1.message.message_model import MsgKey
from backend.api_v1.base.base_repository import BaseRepository


class MsgKeyRepository(BaseRepository):
    model = MsgKey

    async def get_sort_all(
        self, filters: dict | None = None
    ) -> Sequence[Row[Any] | RowMapping | Any]:
        stmt = select(self.model).order_by(desc("id"))
        if filters:
            conditions = []
            if all([isinstance(value, list) for value in filters.values()]):
                conditions.extend(
                    getattr(self.model, key).in_(values)
                    for key, values in filters.items()
                )
            else:
                conditions.extend(
                    getattr(self.model, key) == value for key, value in filters.items()
                )
            stmt = stmt.filter(and_(*conditions))
        result = await self.session.scalars(stmt)
        return result.all()
