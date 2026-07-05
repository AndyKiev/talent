from typing import Sequence

from sqlalchemy import select

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.menu.menu_model import Menu


class MenuRepository(BaseRepository):

    model = Menu

    async def get_active_ordered(self) -> Sequence[Menu]:
        """All active menu items, parents and children alike, in sort order."""
        stmt = (
            select(self.model)
            .where(self.model.is_active.is_(True))
            .order_by(self.model.sort_order, self.model.id)
        )
        result = await self.session.scalars(stmt)
        return result.all()
