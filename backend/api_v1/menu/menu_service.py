# backend/api_v1/menu/menu_service.py
from typing import Optional, List

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.menu.menu_repository import MenuRepository
from backend.api_v1.menu.menu_schema import MenuSchema
from backend.api_v1.employee.employee_schema import EmployeeSchema


class MenuService(BaseService):

    def __init__(
        self,
        repository: MenuRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_all_menus(self) -> List[MenuSchema]:
        """Every active menu item — used by the developer default-menu select."""
        records = await self.repository.get_active_ordered()
        return [MenuSchema.model_validate(r) for r in records]

    async def get_my_menus(self) -> List[MenuSchema]:
        """The current user's visible menu items (flat; FE nests by parent_id).

        Visibility per item:
          - user has NO groups ('regular' user) -> only visible_to_regular items;
          - allowed_groups is NULL              -> any user with >=1 group;
          - otherwise                            -> group-name intersection
                                                   (case-insensitive).
        A child whose parent is invisible is dropped too.
        """
        user_groups = {g.lower() for g in (self.user.groups if self.user else [])}

        def item_visible(menu) -> bool:
            if not user_groups:
                return bool(menu.visible_to_regular)
            if menu.allowed_groups is None:
                return True
            allowed = {
                g.strip().lower()
                for g in menu.allowed_groups.split(",")
                if g.strip()
            }
            return bool(user_groups & allowed)

        records = await self.repository.get_active_ordered()
        visible_ids = {m.id for m in records if item_visible(m)}
        return [
            MenuSchema.model_validate(m)
            for m in records
            if m.id in visible_ids
            and (m.parent_id is None or m.parent_id in visible_ids)
        ]
