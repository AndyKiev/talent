from typing import Optional, List

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.department.department_repository import DepartmentRepository
from backend.api_v1.department.department_schema import (
    Department as DepartmentSchema,
    DepartmentFlat,
    DepartmentCreate,
    DepartmentUpdate,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.department.department_errors import (
    DepartmentNotFound,
    DepartmentDeleteError,
    DepartmentNotFoundByName,
    DepartmentCircularReferenceError,
)
from backend.api_v1.department.department_success import (
    DepartmentDeleteSuccess,
    DepartmentCreateSuccess,
    DepartmentUpdateSuccess,
)
from backend.api_v1.department_category.department_category_schema import DepartmentCategory as DepartmentCategorySchema
from backend.api_v1.department_type.department_type_schema import DepartmentType as DepartmentTypeSchema


class DepartmentService(BaseService):
    def __init__(
        self,
        repository: DepartmentRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_departments(
        self,
        name: Optional[str] = None,
        is_active: Optional[bool] = None,
        department_type_id: Optional[int] = None,
        department_category_id: Optional[int] = None,
        sort: Optional[str] = None,
    ) -> List[DepartmentFlat]:
        if name:
            record = await self.get_by_name(name, not_found_exc=DepartmentNotFoundByName)
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

    async def get_root_departments(self) -> List[DepartmentFlat]:
        """Return all departments with parent_id IS NULL."""
        records = await self.repository.get_roots_with_rels()
        return [DepartmentFlat.model_validate(r) for r in records]

    async def get_tree(self) -> List[DepartmentSchema]:
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
                department_category=DepartmentCategorySchema.model_validate(dept.department_category)
                if dept.department_category else None,
                department_type=DepartmentTypeSchema.model_validate(dept.department_type)
                if dept.department_type else None,
                children=[build_schema(child) for child in children_map[dept.id]]
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
                department_category=DepartmentCategorySchema.model_validate(dept.department_category)
                if dept.department_category else None,
                department_type=DepartmentTypeSchema.model_validate(dept.department_type)
                if dept.department_type else None,
                children=[build_schema(child) for child in children_map[dept.id]]
            )

        return build_schema(node)

    async def _assert_no_circular_reference(
        self, department_id: int, new_parent_id: int, name: str
    ) -> None:
        if new_parent_id == department_id:
            raise await self._resolve_domain_error(DepartmentCircularReferenceError(name))
        descendant_ids = await self.repository.get_descendant_ids(department_id)
        if new_parent_id in descendant_ids:
            raise await self._resolve_domain_error(DepartmentCircularReferenceError(name))

    async def create_department(
            self, dept_in: DepartmentCreate
    ) -> MutationResponse[DepartmentSchema]:
        try:
            record = await self.create(dept_in)
            schema = await self.get_department_tree_node(record.id)
            detail = await self._resolve_domain_success(DepartmentCreateSuccess(schema.name))
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(DepartmentNotFound(dept_in.parent_id or 0))

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
            detail = await self._resolve_domain_success(DepartmentUpdateSuccess(schema.name))
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(DepartmentNotFound(dept_update.parent_id or 0))

    async def delete_department(self, dept_id: int) -> None:
        record = await self.get_by_id(dept_id)
        await self.delete_by_id(
            dept_id,
            name=record.name,
            delete_error_exc=DepartmentDeleteError,
            delete_success_exc=DepartmentDeleteSuccess,
        )