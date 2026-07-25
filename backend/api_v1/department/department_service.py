
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.department.department_messages import (
    DepartmentCircularReferenceError,
    DepartmentCreateSuccess,
    DepartmentDeleteError,
    DepartmentDeleteSuccess,
    DepartmentGenerateCategoryNotFound,
    DepartmentNotFound,
    DepartmentNotFoundByName,
    DepartmentSubtreeGenerateSuccess,
    DepartmentUpdateSuccess,
)
from backend.api_v1.department.department_model import Department
from backend.api_v1.department.department_org_units import resolve_top_org_unit
from backend.api_v1.department.department_repository import DepartmentRepository
from backend.api_v1.department.department_schema import (
    Department as DepartmentSchema,
)
from backend.api_v1.department.department_schema import (
    DepartmentCreate,
    DepartmentFlat,
    DepartmentSubtreeGenerateResult,
    DepartmentTopResolution,
    DepartmentUpdate,
)
from backend.api_v1.department_category.department_category_model import (
    DepartmentCategory,
)
from backend.api_v1.department_category.department_category_schema import (
    DepartmentCategory as DepartmentCategorySchema,
)
from backend.api_v1.department_type.department_type_model import DepartmentType
from backend.api_v1.department_type.department_type_schema import (
    DepartmentType as DepartmentTypeSchema,
)
from backend.api_v1.department_type_parental_links.department_type_parental_link_repository import (
    DepartmentTypeParentalLinkRepository,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema


class DepartmentService(BaseService):
    def __init__(
        self,
        repository: DepartmentRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_departments(
        self,
        name: str | None = None,
        is_active: bool | None = None,
        department_type_id: int | None = None,
        department_category_id: int | None = None,
        sort: str | None = None,
    ) -> list[DepartmentFlat]:
        if name:
            record = await self.get_by_name(
                name, not_found_exc=DepartmentNotFoundByName
            )
            return [DepartmentFlat.model_validate(record)]
        filters = {}
        if is_active is not None:
            filters["is_active"] = is_active
        if department_type_id is not None:
            filters["department_type_id"] = department_type_id
        if department_category_id is not None:
            filters["department_category_id"] = department_category_id
        records = await self.get_all(params=filters or None, sort_json=sort)
        return [DepartmentFlat.model_validate(r) for r in records]

    async def get_root_departments(self) -> list[DepartmentFlat]:
        """Return all departments with parent_id IS NULL."""
        records = await self.repository.get_roots_with_rels()
        return [DepartmentFlat.model_validate(r) for r in records]

    async def resolve_top_org_units(
        self, department_ids: list[int]
    ) -> list[DepartmentTopResolution]:
        """
        For each department id, resolve its top-level org unit (board /
        directorate / store) by walking up the tree. Reuses the flat org-unit
        index, so it's one query regardless of how many ids are passed.
        Used by the employee job-history view (main + subordinate department).
        """
        index = await self.repository.get_org_unit_index()
        return [
            DepartmentTopResolution(
                department_id=did,
                top=resolve_top_org_unit(did, index),
            )
            for did in department_ids
        ]

    async def get_tree(self) -> list[DepartmentSchema]:
        """Return full tree as a list of root departments with nested children."""
        all_depts = await self.repository.get_all_with_rels()

        dept_map = {d.id: d for d in all_depts}
        children_map = {d.id: [] for d in all_depts}
        for dept in all_depts:
            if dept.parent_id is not None and dept.parent_id in dept_map:
                children_map[dept.parent_id].append(dept)

        roots = [dept for dept in all_depts if dept.parent_id is None]

        def build_schema(dept):
            return DepartmentSchema(
                id=dept.id,
                name=dept.name,
                is_active=dept.is_active,
                parent_id=dept.parent_id,
                department_category_id=dept.department_category_id,
                department_type_id=dept.department_type_id,
                created_at=dept.created_at,
                department_category=(
                    DepartmentCategorySchema.model_validate(dept.department_category)
                    if dept.department_category
                    else None
                ),
                department_type=(
                    DepartmentTypeSchema.model_validate(dept.department_type)
                    if dept.department_type
                    else None
                ),
                children=[build_schema(child) for child in children_map[dept.id]],
            )

        return [build_schema(root) for root in roots]

    async def get_department_tree_node(self, department_id: int) -> DepartmentSchema:
        """Return subtree rooted at department_id."""
        all_depts = await self.repository.get_all_with_rels()
        dept_map = {d.id: d for d in all_depts}
        children_map = {d.id: [] for d in all_depts}
        for dept in all_depts:
            if dept.parent_id is not None and dept.parent_id in dept_map:
                children_map[dept.parent_id].append(dept)

        node = dept_map.get(department_id)
        if not node:
            raise await self._resolve_domain_error(DepartmentNotFound(department_id))

        def build_schema(dept):
            return DepartmentSchema(
                id=dept.id,
                name=dept.name,
                is_active=dept.is_active,
                parent_id=dept.parent_id,
                department_category_id=dept.department_category_id,
                department_type_id=dept.department_type_id,
                created_at=dept.created_at,
                department_category=(
                    DepartmentCategorySchema.model_validate(dept.department_category)
                    if dept.department_category
                    else None
                ),
                department_type=(
                    DepartmentTypeSchema.model_validate(dept.department_type)
                    if dept.department_type
                    else None
                ),
                children=[build_schema(child) for child in children_map[dept.id]],
            )

        return build_schema(node)

    async def _assert_no_circular_reference(
        self, department_id: int, new_parent_id: int, name: str
    ) -> None:
        if new_parent_id == department_id:
            raise await self._resolve_domain_error(
                DepartmentCircularReferenceError(name)
            )
        descendant_ids = await self.repository.get_descendant_ids(department_id)
        if new_parent_id in descendant_ids:
            raise await self._resolve_domain_error(
                DepartmentCircularReferenceError(name)
            )

    async def create_department(
        self, dept_in: DepartmentCreate
    ) -> MutationResponse[DepartmentSchema]:
        try:
            record = await self.create(dept_in)
            schema = await self.get_department_tree_node(record.id)
            detail = await self._resolve_domain_success(
                DepartmentCreateSuccess(schema.name)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                DepartmentNotFound(dept_in.parent_id or 0)
            )

    async def update_department(
        self, dept_id: int, dept_update: DepartmentUpdate
    ) -> MutationResponse[DepartmentSchema]:
        orm_record = await self.get_by_id(dept_id)

        if dept_update.parent_id is not None:
            await self._assert_no_circular_reference(
                dept_id, dept_update.parent_id, orm_record.name
            )

        try:
            await self.update(orm_record, dept_update, partial=True)
            schema = await self.get_department_tree_node(dept_id)
            detail = await self._resolve_domain_success(
                DepartmentUpdateSuccess(schema.name)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                DepartmentNotFound(dept_update.parent_id or 0)
            )

    async def delete_department(self, dept_id: int) -> None:
        record = await self.get_by_id(dept_id)
        await self.delete_by_id(
            dept_id,
            name=record.name,
            delete_error_exc=DepartmentDeleteError,
            delete_success_exc=DepartmentDeleteSuccess,
        )

    # ------------------------------------------------------------------
    # Subtree generation (mass-create department instances from the
    # department-type parental graph). All work happens in ONE session /
    # transaction: instances are added + flushed to obtain ids as we
    # descend, and committed exactly once at the end (full rollback on error).
    # ------------------------------------------------------------------

    # category key on the SELECTED department  ->  target category key for new rows
    _CATEGORY_KEY_MAP = {
        "store": "store_departments",
        "directorate": "office_departments",
    }
    _FALLBACK_CATEGORY_KEY = "not_specified"

    async def _resolve_target_category(self, root: Department) -> DepartmentCategory:
        """
        Decide which category newly generated departments get, based on the
        selected (root) department's own category key, then load that category
        by key. Raises if the target category does not exist.
        """
        source_key = root.department_category.key if root.department_category else None
        target_key = self._CATEGORY_KEY_MAP.get(source_key, self._FALLBACK_CATEGORY_KEY)

        category = (
            await self.session.execute(
                select(DepartmentCategory).where(DepartmentCategory.key == target_key)
            )
        ).scalar_one_or_none()

        if category is None:
            raise await self._resolve_domain_error(
                DepartmentGenerateCategoryNotFound(target_key)
            )
        return category

    async def generate_subtree(
        self, department_id: int
    ) -> DepartmentSubtreeGenerateResult:
        # Load EVERY department once, with category + type eager-loaded. This is
        # the key to staying greenlet-safe: we never touch a lazy relationship
        # (e.g. node.children) during the async walk — we traverse an in-memory
        # map instead, so no SQL is emitted implicitly mid-recursion.
        all_depts = list(await self.repository.get_all_with_rels())
        dept_by_id = {d.id: d for d in all_depts}

        root = dept_by_id.get(department_id)
        if root is None:
            raise await self._resolve_domain_error(DepartmentNotFound(department_id))

        # parent_id -> [child Department, ...] (only existing rows for now)
        children_by_parent: dict[int, list[Department]] = {}
        for d in all_depts:
            if d.parent_id is not None:
                children_by_parent.setdefault(d.parent_id, []).append(d)

        # Target category for every newly created instance (root.department_category
        # was eager-loaded by get_all_with_rels, so this access is safe).
        category = await self._resolve_target_category(root)

        # Active type graph: parent_type_id -> [child_type_id, ...]
        link_repo = DepartmentTypeParentalLinkRepository(session=self.session)
        child_type_map = await link_repo.get_active_child_map()

        # Type id -> name (for naming new departments).
        type_rows = (await self.session.execute(select(DepartmentType))).scalars().all()
        type_name_by_id = {t.id: t.name for t in type_rows}

        created: list[Department] = []
        # Guard against type-graph cycles within a single root-to-leaf path.
        visited_types: set[int] = set()

        async def walk(node: Department) -> None:
            node_type_id = node.department_type_id
            if node_type_id in visited_types:
                return
            visited_types.add(node_type_id)

            child_type_ids = child_type_map.get(node_type_id, [])
            if child_type_ids:
                # Existing direct children of `node`, indexed by their type id —
                # read from the in-memory map, NOT node.children.
                existing_by_type: dict[int, Department] = {}
                for child in children_by_parent.get(node.id, []):
                    existing_by_type.setdefault(child.department_type_id, child)

                for child_type_id in child_type_ids:
                    existing = existing_by_type.get(child_type_id)
                    if existing is not None:
                        # Already present — descend, do not create.
                        await walk(existing)
                        continue

                    # Missing — create the instance for this child type.
                    new_dept = Department(
                        name=type_name_by_id.get(child_type_id, str(child_type_id)),
                        is_active=True,
                        parent_id=node.id,
                        department_category_id=category.id,
                        department_type_id=child_type_id,
                    )
                    self.session.add(new_dept)
                    # Flush to assign new_dept.id (grandchildren reference it),
                    # all within the same uncommitted transaction.
                    await self.session.flush()
                    # Update the in-memory map so deeper recursion sees it.
                    children_by_parent.setdefault(node.id, []).append(new_dept)
                    created.append(new_dept)

                    await walk(new_dept)

            # Allow the same type to appear under different branches.
            visited_types.discard(node_type_id)

        await walk(root)

        # Single commit for the whole subtree.
        await self.session.commit()

        # Re-fetch the created rows by id WITH category + type eager-loaded, so
        # validating DepartmentFlat (which reads those relationships and the
        # server-defaulted created_at) never triggers a lazy load. Order by id
        # to keep the response stable.
        created_flat: list[DepartmentFlat] = []
        if created:
            created_ids = [d.id for d in created]
            refreshed = await self.repository.get_by_ids_with_rels(created_ids)
            created_flat = [DepartmentFlat.model_validate(r) for r in refreshed]

        detail = await self._resolve_domain_success(
            DepartmentSubtreeGenerateSuccess(len(created), root.name)
        )
        return DepartmentSubtreeGenerateResult(
            detail=detail,
            root_id=department_id,
            created_count=len(created),
            created=created_flat,
        )
