from collections.abc import Sequence

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.menu.menu_model import Menu
from backend.api_v1.table_relationship_links.menu_user_group_link_model import (
    MenuUserGroupLink,
)
from sqlalchemy import delete, select


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

    async def get_all_ordered(self) -> Sequence[Menu]:
        """Every menu item (active AND inactive) in sort order — for the editor."""
        stmt = select(self.model).order_by(self.model.sort_order, self.model.id)
        result = await self.session.scalars(stmt)
        return result.all()

    async def set_group_links(self, menu_id: int, group_ids: list[int]) -> None:
        """Replace a menu's group links with exactly `group_ids` (by id)."""
        await self.session.execute(
            delete(MenuUserGroupLink).where(MenuUserGroupLink.menu_id == menu_id)
        )
        if group_ids:
            self.session.add_all(
                [
                    MenuUserGroupLink(menu_id=menu_id, user_group_id=gid)
                    for gid in dict.fromkeys(group_ids)  # dedupe, keep order
                ]
            )
        await self.session.commit()
