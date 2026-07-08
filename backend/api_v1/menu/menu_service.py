# backend/api_v1/menu/menu_service.py
from typing import Optional, List

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.menu.menu_repository import MenuRepository
from backend.api_v1.menu.menu_schema import (
    MenuSchema,
    MenuAdminSchema,
    MenuCreate,
    MenuUpdate,
)
from backend.api_v1.menu.menu_errors import (
    MenuNotFound,
    MenuKeyTaken,
    MenuGroupsNotFound,
    MenuParentInvalid,
    MenuDeleteError,
)
from backend.api_v1.menu.menu_success import (
    MenuCreateSuccess,
    MenuUpdateSuccess,
    MenuDeleteSuccess,
)
from backend.api_v1.user_group.user_group_model import UserGroup
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

    # ── Developer menu editor (CRUD) ──────────────────────────────────────────

    @staticmethod
    def _to_admin_schema(menu) -> MenuAdminSchema:
        schema = MenuAdminSchema.model_validate(menu)
        schema.group_ids = menu.allowed_group_ids
        return schema

    async def get_menus_admin(self) -> List[MenuAdminSchema]:
        """Every menu item (active + inactive) with full visibility config."""
        records = await self.repository.get_all_ordered()
        return [self._to_admin_schema(m) for m in records]

    async def _validate_groups(self, group_ids: List[int]) -> None:
        if not group_ids:
            return
        found = set(
            (
                await self.session.execute(
                    select(UserGroup.id).where(UserGroup.id.in_(group_ids))
                )
            )
            .scalars()
            .all()
        )
        missing = set(group_ids) - found
        if missing:
            raise await self._resolve_domain_error(MenuGroupsNotFound(missing))

    async def _validate_parent(
        self, parent_id: Optional[int], self_id: Optional[int] = None
    ) -> None:
        """Parent must exist, not be the item itself, and be top-level (one
        level of nesting only)."""
        if parent_id is None:
            return
        if self_id is not None and parent_id == self_id:
            raise await self._resolve_domain_error(
                MenuParentInvalid("a menu cannot be its own parent")
            )
        parent = await self.repository.get_by_id(parent_id)
        if not parent:
            raise await self._resolve_domain_error(
                MenuParentInvalid(f"parent {parent_id} does not exist")
            )
        if parent.parent_id is not None:
            raise await self._resolve_domain_error(
                MenuParentInvalid("only one level of sub-menus is allowed")
            )

    async def create_menu(
        self, menu_in: MenuCreate
    ) -> MutationResponse[MenuAdminSchema]:
        await self._validate_groups(menu_in.group_ids)
        await self._validate_parent(menu_in.parent_id)
        data = menu_in.model_dump(exclude={"group_ids"})
        try:
            record = await self.repository.create_from_dict(data)
        except IntegrityError:
            raise await self._resolve_domain_error(MenuKeyTaken(menu_in.key))
        await self.repository.set_group_links(record.id, menu_in.group_ids)
        fresh = await self.repository.get_by_id(record.id)
        schema = self._to_admin_schema(fresh)
        detail = await self._resolve_domain_success(MenuCreateSuccess(schema.key))
        return MutationResponse(detail=detail, data=schema)

    async def update_menu(
        self, menu_id: int, menu_update: MenuUpdate
    ) -> MutationResponse[MenuAdminSchema]:
        orm = await self.repository.get_by_id(menu_id)
        if not orm:
            raise await self._resolve_domain_error(MenuNotFound(menu_id))
        if menu_update.group_ids is not None:
            await self._validate_groups(menu_update.group_ids)
        if menu_update.parent_id is not None:
            await self._validate_parent(menu_update.parent_id, self_id=menu_id)
        fields = menu_update.model_dump(exclude_unset=True, exclude={"group_ids"})
        if fields:
            try:
                await self.repository.update(instance=orm, instance_update=fields)
            except IntegrityError:
                raise await self._resolve_domain_error(
                    MenuKeyTaken(menu_update.key or orm.key)
                )
        if menu_update.group_ids is not None:
            await self.repository.set_group_links(menu_id, menu_update.group_ids)
        fresh = await self.repository.get_by_id(menu_id)
        schema = self._to_admin_schema(fresh)
        detail = await self._resolve_domain_success(MenuUpdateSuccess(schema.key))
        return MutationResponse(detail=detail, data=schema)

    async def delete_menu(self, menu_id: int) -> None:
        record = await self.repository.get_by_id(menu_id)
        if not record:
            raise await self._resolve_domain_error(MenuNotFound(menu_id))
        await self.delete_by_id(
            menu_id,
            name=record.key,
            delete_error_exc=MenuDeleteError,
            delete_success_exc=MenuDeleteSuccess,
        )

    async def get_my_menus(self) -> List[MenuSchema]:
        """The current user's visible menu items (flat; FE nests by parent_id).

        Visibility per item (matched by group **id**, never name):
          - user has NO groups ('regular' user) -> only visible_to_regular items;
          - visible_to_all_groups is True       -> any user with >=1 group;
          - otherwise                            -> intersection of the user's
                                                   group ids with the item's
                                                   linked group ids.
        A child whose parent is invisible is dropped too.
        """
        user_group_ids = set(self.user.group_ids if self.user else [])

        def item_visible(menu) -> bool:
            if not user_group_ids:
                return bool(menu.visible_to_regular)
            if menu.visible_to_all_groups:
                return True
            return bool(user_group_ids & set(menu.allowed_group_ids))

        records = await self.repository.get_active_ordered()
        visible_ids = {m.id for m in records if item_visible(m)}
        return [
            MenuSchema.model_validate(m)
            for m in records
            if m.id in visible_ids
            and (m.parent_id is None or m.parent_id in visible_ids)
        ]
