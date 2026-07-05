# backend/api_v1/employee_responsibility_department/employee_responsibility_department_service.py
from typing import Optional, List

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee_responsibility_department.employee_responsibility_department_repository import (
    EmployeeResponsibilityDepartmentRepository,
)
from backend.api_v1.employee_responsibility_department.employee_responsibility_department_schema import (
    EmployeeResponsibilityDepartmentSchema,
    EmployeeResponsibilityDepartmentCreate,
    EmployeeResponsibilityDepartmentUpdate,
)
from backend.api_v1.employee_responsibility_department.employee_responsibility_department_errors import (
    EmployeeResponsibilityDepartmentNotFound,
    EmployeeResponsibilityDepartmentAlreadyExists,
    EmployeeResponsibilityDepartmentDeleteError,
)
from backend.api_v1.employee_responsibility_department.employee_responsibility_department_success import (
    EmployeeResponsibilityDepartmentCreateSuccess,
    EmployeeResponsibilityDepartmentUpdateSuccess,
    EmployeeResponsibilityDepartmentDeleteSuccess,
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


class EmployeeResponsibilityDepartmentService(BaseService):

    def __init__(
        self,
        repository: EmployeeResponsibilityDepartmentRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    # ── Internal helpers ───────────────────────────────────────────────────────

    async def _get_org_index(self) -> DepartmentIndex:
        """Flat department index for deriving each assignment's top-level org
        unit. Uses the repository's session (always present)."""
        dept_repo = DepartmentRepository(session=self.repository.session)
        return await dept_repo.get_org_unit_index()

    def _to_schema(
        self, orm_record, org_index: DepartmentIndex
    ) -> EmployeeResponsibilityDepartmentSchema:
        schema = EmployeeResponsibilityDepartmentSchema.model_validate(orm_record)
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
        existing = await self.repository.get_by_double(employee_id, department_id)
        if existing and (exclude_link_id is None or existing.id != exclude_link_id):
            exc = EmployeeResponsibilityDepartmentAlreadyExists(
                employee_id, department_id
            )
            raise await self._resolve_domain_error(exc)

    # ── Read ───────────────────────────────────────────────────────────────────

    async def get_by_id(
        self, link_id: int, employee_id: int
    ) -> EmployeeResponsibilityDepartmentSchema:
        record = await self.repository.get_by_id(link_id)
        if not record or record.employee_id != employee_id:
            raise await self._resolve_domain_error(
                EmployeeResponsibilityDepartmentNotFound(link_id)
            )
        org_index = await self._get_org_index()
        return self._to_schema(record, org_index)

    async def get_by_employee(
        self, employee_id: int
    ) -> List[EmployeeResponsibilityDepartmentSchema]:
        records = await self.repository.get_by_employee(employee_id)
        org_index = await self._get_org_index()
        return [self._to_schema(r, org_index) for r in records]

    # ── Write ──────────────────────────────────────────────────────────────────

    async def create_link(
        self,
        employee_id: int,
        link_in: EmployeeResponsibilityDepartmentCreate,
    ) -> MutationResponse[EmployeeResponsibilityDepartmentSchema]:
        await self._assert_double_is_free(employee_id, link_in.department_id)

        try:
            orm_record = await self.repository.create_from_dict(
                {
                    "employee_id": employee_id,
                    "department_id": link_in.department_id,
                }
            )
            orm_record = await self.repository.get_by_id(orm_record.id)

            org_index = await self._get_org_index()
            schema = self._to_schema(orm_record, org_index)
            label = _link_label(link_in.department_id)
            detail = await self._resolve_domain_success(
                EmployeeResponsibilityDepartmentCreateSuccess(label)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                EmployeeResponsibilityDepartmentAlreadyExists(
                    employee_id, link_in.department_id
                )
            )

    async def update_link(
        self,
        link_id: int,
        employee_id: int,
        link_update: EmployeeResponsibilityDepartmentUpdate,
    ) -> MutationResponse[EmployeeResponsibilityDepartmentSchema]:
        orm_record = await self.repository.get_by_id(link_id)
        if not orm_record or orm_record.employee_id != employee_id:
            raise await self._resolve_domain_error(
                EmployeeResponsibilityDepartmentNotFound(link_id)
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
                EmployeeResponsibilityDepartmentUpdateSuccess(label)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                EmployeeResponsibilityDepartmentAlreadyExists(
                    employee_id, effective_department_id
                )
            )

    async def delete_link(self, link_id: int, employee_id: int) -> None:
        orm_record = await self.repository.get_by_id(link_id)
        if not orm_record or orm_record.employee_id != employee_id:
            raise await self._resolve_domain_error(
                EmployeeResponsibilityDepartmentNotFound(link_id)
            )
        label = _link_label(orm_record.department_id)
        await self.delete_by_id(
            link_id,
            name=label,
            delete_error_exc=EmployeeResponsibilityDepartmentDeleteError,
            delete_success_exc=EmployeeResponsibilityDepartmentDeleteSuccess,
        )
