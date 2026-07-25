
from sqlalchemy import select

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.department_type_parental_links.department_type_parental_link_model import (
    DepartmentTypeParentalLink,
)


class DepartmentTypeParentalLinkRepository(BaseRepository):
    model = DepartmentTypeParentalLink

    async def get_active_child_map(self) -> dict[int, list[int]]:
        """
        Return {parent_type_id: [child_type_id, ...]} built from all ACTIVE
        parental links. Used by the subtree generator to walk the type graph
        in memory (one query instead of per-node lookups).
        """
        stmt = select(
            DepartmentTypeParentalLink.parent_id,
            DepartmentTypeParentalLink.child_id,
        ).where(DepartmentTypeParentalLink.is_active.is_(True))
        result = await self.session.execute(stmt)
        child_map: dict[int, list[int]] = {}
        for parent_id, child_id in result.all():
            child_map.setdefault(parent_id, []).append(child_id)
        return child_map
