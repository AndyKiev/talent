from typing import Sequence, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.department.department_model import Department


class DepartmentRepository(BaseRepository):

    model = Department

    async def get_roots(self) -> Sequence[Department]:
        """Return all top-level departments (parent_id IS NULL)."""
        stmt = (
            select(self.model)
            .where(self.model.parent_id.is_(None))
            .order_by(self.model.id)
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def get_roots_with_rels(self) -> Sequence[Department]:
        """Root departments (parent_id IS NULL) with category + type preloaded."""
        stmt = (
            select(self.model)
            .where(self.model.parent_id.is_(None))
            .options(
                selectinload(self.model.department_category),
                selectinload(self.model.department_type),
            )
            .order_by(self.model.id)
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def get_descendant_ids(self, department_id: int) -> set[int]:
        """Collect all descendant IDs via BFS — used for circular-reference guard."""
        visited: set[int] = set()
        queue: list[int] = [department_id]

        while queue:
            current_id = queue.pop()
            if current_id in visited:
                continue
            visited.add(current_id)
            stmt = select(self.model.id).where(self.model.parent_id == current_id)
            result = await self.session.scalars(stmt)
            queue.extend(result.all())

        visited.discard(department_id)
        return visited

    async def get_all_with_rels(self) -> Sequence[Department]:
        """Fetch all departments with category and type preloaded."""
        stmt = (
            select(self.model)
            .options(
                selectinload(self.model.department_category),
                selectinload(self.model.department_type),
            )
            .order_by(self.model.id)
        )
        result = await self.session.scalars(stmt)
        return result.all()
