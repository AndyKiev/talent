# backend/api_v1/employee_department/employee_department_service.py
from typing import Optional, List

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee_department.employee_department_repository import (
    EmployeeDepartmentRepository,
)
from backend.api_v1.employee_department.employee_department_schema import (
    EmployeeDepartmentSchema,
    EmployeeDepartmentCreate,
    EmployeeDepartmentUpdate,
    EmployeeDepartmentCount,
)
from backend.api_v1.employee_department.employee_department_errors import (
    EmployeeOrgUnitDepartmentNotFound,
    EmployeeDepartmentAlreadyExists,
    EmployeeDepartmentDeleteError,
)
from backend.api_v1.employee_department.employee_department_success import (
    EmployeeOrgUnitDepartmentCreateSuccess,
    EmployeeOrgUnitDepartmentUpdateSuccess,
    EmployeeOrgUnitDepartmentDeleteSuccess,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema

# Top-level org-unit derivation (board / directorate / store).
from backend.api_v1.department.department_repository import DepartmentRepository
from backend.api_v1.department.department_org_units import (
    resolve_top_org_unit,
    DepartmentIndex,
)


def _link_label(department_id: int) -> str:
    """Human-readable identifier used in success/error messages."""
    return f"department={department_id}"


class EmployeeDepartmentService(BaseService):

    def __init__(
        self,
        repository: EmployeeDepartmentRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    # ── Internal helpers ───────────────────────────────────────────────────────

    async def _get_org_index(self) -> DepartmentIndex:
        """Flat department index (id -> (parent_id, name, category_key)) for
        deriving each assignment's top-level org unit. Uses the repository's
        session (always present) rather than self.session, which can be None on
        sessionless construction paths."""
        dept_repo = DepartmentRepository(session=self.repository.session)
        return await dept_repo.get_org_unit_index()

    def _to_schema(
        self, orm_record, org_index: DepartmentIndex
    ) -> EmployeeDepartmentSchema:
        schema = EmployeeDepartmentSchema.model_validate(orm_record)
        schema.top_department = resolve_top_org_unit(
            orm_record.department_id, org_index
        )
        return schema

    async def _assert_double_is_free(
        self,
        employee_id: int,
        department_id: int,
        exclude_link_id: Optional[int] = None,
    ) -> None:
        """
        Raise EmployeeDepartmentAlreadyExists if the (employee_id, department_id)
        pair is already taken, optionally excluding the current record (for updates).
        """
        existing = await self.repository.get_by_double(employee_id, department_id)
        if existing and (exclude_link_id is None or existing.id != exclude_link_id):
            exc = EmployeeDepartmentAlreadyExists(employee_id, department_id)
            raise await self._resolve_domain_error(exc)

    # NOTE: _assert_main_constraint and _ensure_not_main_before_delete have been
    # intentionally removed. Multiple is_main=True assignments are allowed at the
    # service layer. The frontend handles confirmation dialogs for these cases.
    # Access-role restrictions will be added in a future iteration.

    # ── Read ───────────────────────────────────────────────────────────────────

    async def get_by_id(
        self, link_id: int, employee_id: int
    ) -> EmployeeDepartmentSchema:
        record = await self.repository.get_by_id(link_id)
        if not record or record.employee_id != employee_id:
            raise await self._resolve_domain_error(
                EmployeeOrgUnitDepartmentNotFound(link_id)
            )
        org_index = await self._get_org_index()
        return self._to_schema(record, org_index)

    async def get_by_employee(self, employee_id: int) -> List[EmployeeDepartmentSchema]:
        records = await self.repository.get_by_employee(employee_id)
        org_index = await self._get_org_index()
        return [self._to_schema(r, org_index) for r in records]

    async def count_by_employee(self, employee_id: int) -> EmployeeDepartmentCount:
        count = await self.repository.count_by_employee(employee_id)
        return EmployeeDepartmentCount(employee_id=employee_id, count=count)

    # ── Write ──────────────────────────────────────────────────────────────────

    async def create_link(
        self,
        employee_id: int,
        link_in: EmployeeDepartmentCreate,
    ) -> MutationResponse[EmployeeDepartmentSchema]:
        # Only uniqueness is enforced — multiple is_main=True records are allowed.
        await self._assert_double_is_free(employee_id, link_in.department_id)

        try:
            from backend.api_v1.employee_department.employee_department_model import (
                EmployeeDepartment,
            )

            orm_record = EmployeeDepartment(
                employee_id=employee_id,
                department_id=link_in.department_id,
                is_main=link_in.is_main or False,
            )
            self.repository.session.add(orm_record)
            await self.repository.session.commit()
            await self.repository.session.refresh(orm_record)
            orm_record = await self.repository.get_by_id(orm_record.id)

            org_index = await self._get_org_index()
            schema = self._to_schema(orm_record, org_index)
            label = _link_label(link_in.department_id)
            detail = await self._resolve_domain_success(
                EmployeeOrgUnitDepartmentCreateSuccess(label)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                EmployeeDepartmentAlreadyExists(employee_id, link_in.department_id)
            )

    async def update_link(
        self,
        link_id: int,
        employee_id: int,
        link_update: EmployeeDepartmentUpdate,
    ) -> MutationResponse[EmployeeDepartmentSchema]:
        orm_record = await self.repository.get_by_id(link_id)
        if not orm_record or orm_record.employee_id != employee_id:
            raise await self._resolve_domain_error(
                EmployeeOrgUnitDepartmentNotFound(link_id)
            )

        effective_department_id = (
            link_update.department_id
            if link_update.department_id is not None
            else orm_record.department_id
        )

        if effective_department_id != orm_record.department_id:
            await self._assert_double_is_free(
                employee_id,
                effective_department_id,
                exclude_link_id=link_id,
            )

        try:
            updated = await self.update(orm_record, link_update, partial=True)
            org_index = await self._get_org_index()
            schema = self._to_schema(updated, org_index)
            label = _link_label(effective_department_id)
            detail = await self._resolve_domain_success(
                EmployeeOrgUnitDepartmentUpdateSuccess(label)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                EmployeeDepartmentAlreadyExists(employee_id, effective_department_id)
            )

    async def delete_link(self, link_id: int, employee_id: int) -> None:
        # No is_main guard — deletion of main departments is allowed.
        # The frontend handles confirmation dialogs for this case.
        orm_record = await self.repository.get_by_id(link_id)
        if not orm_record or orm_record.employee_id != employee_id:
            raise await self._resolve_domain_error(
                EmployeeOrgUnitDepartmentNotFound(link_id)
            )
        label = _link_label(orm_record.department_id)
        await self.delete_by_id(
            link_id,
            name=label,
            delete_error_exc=EmployeeDepartmentDeleteError,
            delete_success_exc=EmployeeOrgUnitDepartmentDeleteSuccess,
        )
