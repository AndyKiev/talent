# backend/api_v1/employee_department/employee_department_service.py

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.department.department_org_units import (
    DepartmentIndex,
    resolve_top_org_unit,
)

# Top-level org-unit derivation (board / directorate / store).
from backend.api_v1.department.department_repository import DepartmentRepository
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee_department.employee_department_messages import (
    EmployeeDepartmentDeleteError,
    EmployeeDepartmentMainAlreadyExistsError,
    EmployeeOrgUnitDepartmentCreateSuccess,
    EmployeeOrgUnitDepartmentDeleteSuccess,
    EmployeeOrgUnitDepartmentNotFound,
    EmployeeOrgUnitDepartmentUpdateSuccess,
)
from backend.api_v1.employee_department.employee_department_repository import (
    EmployeeDepartmentRepository,
)
from backend.api_v1.employee_department.employee_department_schema import (
    EmployeeDepartmentCreate,
    EmployeeDepartmentSchema,
    EmployeeDepartmentUpdate,
)


def _link_label(department_id: int) -> str:
    """Human-readable identifier used in success/error messages."""
    return f"department={department_id}"


class EmployeeDepartmentService(BaseService):

    def __init__(
        self,
        repository: EmployeeDepartmentRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
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

    async def get_by_employee(self, employee_id: int) -> list[EmployeeDepartmentSchema]:
        records = await self.repository.get_by_employee(employee_id)
        org_index = await self._get_org_index()
        return [self._to_schema(r, org_index) for r in records]

    # ── Write ──────────────────────────────────────────────────────────────────

    async def create_link(
        self,
        employee_id: int,
        link_in: EmployeeDepartmentCreate,
    ) -> MutationResponse[EmployeeDepartmentSchema]:
        # One main department per employee — reject if one already exists.
        existing_main = await self.repository.get_main_by_employee(employee_id)
        if existing_main is not None:
            raise await self._resolve_domain_error(
                EmployeeDepartmentMainAlreadyExistsError(
                    employee_id, existing_main.id
                )
            )

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
                EmployeeOrgUnitDepartmentCreateSuccess(label)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                EmployeeDepartmentMainAlreadyExistsError(employee_id)
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

        updated = await self.update(orm_record, link_update, partial=True)
        org_index = await self._get_org_index()
        schema = self._to_schema(updated, org_index)
        label = _link_label(effective_department_id)
        detail = await self._resolve_domain_success(
            EmployeeOrgUnitDepartmentUpdateSuccess(label)
        )
        return MutationResponse(detail=detail, data=schema)

    async def delete_link(self, link_id: int, employee_id: int) -> None:
        # The frontend handles confirmation dialogs for main-department deletion.
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
