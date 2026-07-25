# backend/api_v1/employee_responsibility_department/employee_responsibility_department_service.py

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee_responsibility_department.employee_responsibility_department_messages import (
    EmployeeResponsibilityDepartmentAlreadyExists,
    EmployeeResponsibilityDepartmentCreateSuccess,
    EmployeeResponsibilityDepartmentDeleteError,
    EmployeeResponsibilityDepartmentDeleteSuccess,
    EmployeeResponsibilityDepartmentNotFound,
    EmployeeResponsibilityDepartmentUpdateSuccess,
)
from backend.api_v1.employee_responsibility_department.employee_responsibility_department_repository import (
    EmployeeResponsibilityDepartmentRepository,
)
from backend.api_v1.employee_responsibility_department.employee_responsibility_department_schema import (
    EmployeeResponsibilityDepartmentCreate,
    EmployeeResponsibilityDepartmentSchema,
    EmployeeResponsibilityDepartmentUpdate,
)
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession


def _link_label(department_type_id: int) -> str:
    """Human-readable identifier used in success/error messages."""
    return f"department_type={department_type_id}"


class EmployeeResponsibilityDepartmentService(BaseService):

    def __init__(
        self,
        repository: EmployeeResponsibilityDepartmentRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, user=user, session=session)

    # ── Internal helpers ───────────────────────────────────────────────────────

    def _to_schema(
        self, orm_record
    ) -> EmployeeResponsibilityDepartmentSchema:
        # Responsibility is keyed on a department TYPE, which has no position in
        # the org tree — so there is no top-level org unit to derive here.
        return EmployeeResponsibilityDepartmentSchema.model_validate(orm_record)

    async def _assert_double_is_free(
        self,
        employee_id: int,
        department_type_id: int,
        exclude_link_id: int | None = None,
    ) -> None:
        existing = await self.repository.get_by_double(
            employee_id, department_type_id
        )
        if existing and (exclude_link_id is None or existing.id != exclude_link_id):
            exc = EmployeeResponsibilityDepartmentAlreadyExists(
                employee_id, department_type_id
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
        return self._to_schema(record)

    async def get_by_employee(
        self, employee_id: int
    ) -> list[EmployeeResponsibilityDepartmentSchema]:
        records = await self.repository.get_by_employee(employee_id)
        return [self._to_schema(r) for r in records]

    # ── Write ──────────────────────────────────────────────────────────────────

    async def create_link(
        self,
        employee_id: int,
        link_in: EmployeeResponsibilityDepartmentCreate,
    ) -> MutationResponse[EmployeeResponsibilityDepartmentSchema]:
        await self._assert_double_is_free(employee_id, link_in.department_type_id)

        try:
            orm_record = await self.repository.create_from_dict(
                {
                    "employee_id": employee_id,
                    "department_type_id": link_in.department_type_id,
                }
            )
            orm_record = await self.repository.get_by_id(orm_record.id)

            schema = self._to_schema(orm_record)
            label = _link_label(link_in.department_type_id)
            detail = await self._resolve_domain_success(
                EmployeeResponsibilityDepartmentCreateSuccess(label)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                EmployeeResponsibilityDepartmentAlreadyExists(
                    employee_id, link_in.department_type_id
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

        effective_type_id = (
            link_update.department_type_id
            if link_update.department_type_id is not None
            else orm_record.department_type_id
        )

        if effective_type_id != orm_record.department_type_id:
            await self._assert_double_is_free(
                employee_id,
                effective_type_id,
                exclude_link_id=link_id,
            )

        try:
            updated = await self.update(orm_record, link_update, partial=True)
            schema = self._to_schema(updated)
            label = _link_label(effective_type_id)
            detail = await self._resolve_domain_success(
                EmployeeResponsibilityDepartmentUpdateSuccess(label)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                EmployeeResponsibilityDepartmentAlreadyExists(
                    employee_id, effective_type_id
                )
            )

    async def delete_link(self, link_id: int, employee_id: int) -> None:
        orm_record = await self.repository.get_by_id(link_id)
        if not orm_record or orm_record.employee_id != employee_id:
            raise await self._resolve_domain_error(
                EmployeeResponsibilityDepartmentNotFound(link_id)
            )
        label = _link_label(orm_record.department_type_id)
        await self.delete_by_id(
            link_id,
            name=label,
            delete_error_exc=EmployeeResponsibilityDepartmentDeleteError,
            delete_success_exc=EmployeeResponsibilityDepartmentDeleteSuccess,
        )
