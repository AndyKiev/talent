from collections.abc import Sequence

from sqlalchemy import case, func, select
from sqlalchemy.orm import noload, selectinload

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.department.department_model import Department


class DepartmentRepository(BaseRepository):

    model = Department

    @classmethod
    def _flat_load_options(cls):
        """Loader options that fetch ONLY category + type and SUPPRESS every
        model-level selectin cascade that otherwise fires on any Department
        query: children/parent walk the tree level by level in both directions,
        and the loaded category/type rows each selectin their own `departments`
        collection (re-loading the whole table) plus the type parent/child
        graph. The tree/service code builds hierarchy from parent_id in Python,
        so none of that is needed — with these options a full-table load is
        3 queries total instead of a cascade."""
        from backend.api_v1.department_category.department_category_model import (
            DepartmentCategory,
        )
        from backend.api_v1.department_type.department_type_model import (
            DepartmentType,
        )

        return (
            noload(cls.model.parent),
            noload(cls.model.children),
            selectinload(cls.model.department_category).options(
                noload(DepartmentCategory.departments),
            ),
            selectinload(cls.model.department_type).options(
                noload(DepartmentType.departments),
                noload(DepartmentType.parents),
                noload(DepartmentType.children),
            ),
        )

    async def get_roots(self) -> Sequence[Department]:
        """Return all top-level departments (parent_id IS NULL)."""
        stmt = (
            select(self.model)
            .where(self.model.parent_id.is_(None))
            .options(*self._flat_load_options())
            .order_by(self.model.id)
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def get_roots_with_rels(self) -> Sequence[Department]:
        """Root departments (parent_id IS NULL) with category + type preloaded."""
        stmt = (
            select(self.model)
            .where(self.model.parent_id.is_(None))
            .options(*self._flat_load_options())
            .order_by(self.model.id)
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def get_descendant_ids(self, department_id: int) -> set[int]:
        """Collect all descendant IDs via BFS -- used for circular-reference guard."""
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

    async def get_subtree_ids(self, root_ids: set[int] | list[int]) -> set[int]:
        """
        Return the union of the given roots and ALL their descendants, in a single
        recursive CTE (one round-trip, regardless of tree depth or number of roots).

        Includes the roots themselves -- contrast with get_descendant_ids, which
        excludes its starting node and does one query per level. Use this for
        "ancestor-or-self" visibility checks (e.g. HRM scope filtering).
        """
        roots = {int(r) for r in root_ids}
        if not roots:
            return set()

        # Anchor: the root departments.
        base = (
            select(self.model.id, self.model.parent_id)
            .where(self.model.id.in_(roots))
            .cte(name="subtree", recursive=True)
        )
        # Recursive step: children of anything already in the CTE.
        child = select(self.model.id, self.model.parent_id).join(
            base, self.model.parent_id == base.c.id
        )
        subtree = base.union_all(child)

        result = await self.session.scalars(select(subtree.c.id))
        return set(result.all())

    async def get_all_with_rels(self) -> Sequence[Department]:
        """Fetch all departments with category and type preloaded (3 queries,
        no relationship cascade — see _flat_load_options)."""
        stmt = (
            select(self.model)
            .options(*self._flat_load_options())
            .order_by(self.model.id)
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def get_by_ids_with_rels(self, ids: list[int]) -> Sequence[Department]:
        """
        Fetch departments by id with category + type eager-loaded, ordered by id.
        Used after subtree generation to build the response without lazy loads.
        """
        if not ids:
            return []
        stmt = (
            select(self.model)
            .where(self.model.id.in_(ids))
            .options(*self._flat_load_options())
            .order_by(self.model.id)
        )
        result = await self.session.scalars(stmt)
        return result.all()

    async def get_scope_select_departments(
        self,
        allowed_ids: set[int] | None,
        store_key: str = "store",
        directorate_key: str = "directorate",
    ) -> list[dict]:
        """
        Departments for the employees-page filter Select, in the required order:
          1) 'store' category instances, ascending by region.sort_order
          2) 'directorate' category instances, ascending by region.sort_order
          3) every other category last
        Ties / missing region sort fall back to department name.

        Only MAIN departments (DepartmentCategory.is_main=True) that are active
        are returned.

        ``allowed_ids``:
          - None  -> ALL active main departments (admin / HRS / dev)
          - set   -> only these department ids (HRM active scopes); empty -> []

        A department may link to several regions; we sort by the MIN active
        region sort_order (scalar subquery, so no row multiplication).
        """
        from backend.api_v1.department_category.department_category_model import (
            DepartmentCategory,
        )
        from backend.api_v1.department_region_link.department_region_link_model import (
            DepartmentRegionLink,
        )
        from backend.api_v1.region.region_model import Region

        if allowed_ids is not None and not allowed_ids:
            return []

        region_sort = (
            select(func.min(Region.sort_order))
            .select_from(DepartmentRegionLink)
            .join(Region, DepartmentRegionLink.region_id == Region.id)
            .where(
                DepartmentRegionLink.department_id == Department.id,
                DepartmentRegionLink.is_active.is_(True),
            )
            .correlate(Department)
            .scalar_subquery()
        )

        category_rank = case(
            (DepartmentCategory.key == store_key, 0),
            (DepartmentCategory.key == directorate_key, 1),
            else_=2,
        )

        stmt = (
            select(
                Department.id,
                Department.name,
                DepartmentCategory.key.label("category_key"),
                DepartmentCategory.name.label("category_name"),
                region_sort.label("region_sort"),
            )
            .join(
                DepartmentCategory,
                Department.department_category_id == DepartmentCategory.id,
            )
            .where(
                Department.is_active.is_(True),
                DepartmentCategory.is_main.is_(True),
            )
            .order_by(
                category_rank,
                region_sort.asc().nullslast(),
                Department.name.asc(),
            )
        )
        if allowed_ids is not None:
            stmt = stmt.where(Department.id.in_(allowed_ids))

        result = await self.session.execute(stmt)
        return [
            {
                "id": row.id,
                "name": row.name,
                "category_key": row.category_key,
                "category_name": row.category_name,
            }
            for row in result.all()
        ]

    async def get_org_unit_index(self) -> dict[int, tuple[int | None, str, str]]:
        """
        Lightweight ancestor-resolution index: department id -> (parent_id, name,
        category_key) for EVERY department, fetched in a single flat query (no
        relationship loading). Feeds department_org_units.resolve_top_org_unit so
        an employee's top-level unit (board/directorate/store) can be derived
        without loading the whole tree per record.
        """
        # Local import keeps the module import graph acyclic.
        from backend.api_v1.department_category.department_category_model import (
            DepartmentCategory,
        )

        stmt = select(
            self.model.id,
            self.model.parent_id,
            self.model.name,
            DepartmentCategory.key,
        ).join(
            DepartmentCategory,
            self.model.department_category_id == DepartmentCategory.id,
        )
        result = await self.session.execute(stmt)
        return {row[0]: (row[1], row[2], row[3]) for row in result.all()}
