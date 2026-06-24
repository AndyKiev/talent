from __future__ import annotations

from datetime import date
from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.hrm_scope.hrm_scope_repository import HrmScopeRepository
from backend.api_v1.hrm_scope.hrm_scope_schema import (
    HrmScopeSchema,
    HrmScopeCreate,
    HrmScopeCreateInternal,
    HrmScopeUpdate,
    HrmEmployeeRow,
)
from backend.api_v1.hrm_scope.hrm_scope_errors import (
    HrmScopeNotFound,
    HrmScopeStartAfterEnd,
    HrmScopeEmployeeNotHrm,
    HrmScopeDeleteError,
)
from backend.api_v1.hrm_scope.hrm_scope_success import (
    HrmScopeCreateSuccess,
    HrmScopeUpdateSuccess,
    HrmScopeDeleteSuccess,
)

from backend.api_v1.hrm_scope.hrm_scope_constants import HRM_GROUP_NAME


class HrmScopeService(BaseService):
    def __init__(
        self,
        repository: HrmScopeRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    async def get_by_id(self, scope_id: int) -> HrmScopeSchema:
        record = await self.repository.get_by_id_with_rels(scope_id)
        if not record:
            raise await self._resolve_domain_error(HrmScopeNotFound(scope_id))
        return self._to_schema(record)

    async def get_employee_scopes(self, employee_id: int) -> List[HrmScopeSchema]:
        rows = await self.repository.get_by_employee(employee_id)
        return [self._to_schema(r) for r in rows]

    async def get_hrm_employees(self) -> List[HrmEmployeeRow]:
        employees = await self.repository.get_hrm_employees(HRM_GROUP_NAME)
        rows: List[HrmEmployeeRow] = []
        for emp in employees:
            scopes = await self.repository.get_by_employee(emp.id)
            active = sum(1 for s in scopes if self._is_active(s.start_date, s.end_date))
            rows.append(
                HrmEmployeeRow(
                    id=emp.id,
                    code=emp.code,
                    name=emp.name,
                    email=emp.email,
                    job_name=emp.job.name if emp.job else None,
                    scope_count=len(scopes),
                    active_scope_count=active,
                )
            )
        return rows

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    async def create_scope(
        self, scope_in: HrmScopeCreate
    ) -> MutationResponse[HrmScopeSchema]:
        if scope_in.start_date > scope_in.end_date:
            raise await self._resolve_domain_error(HrmScopeStartAfterEnd())

        # Resolves the employee AND their HRM-group link row (the lifecycle owner).
        _, link = await self._get_hrm_employee_or_raise(scope_in.employee_id)

        internal = HrmScopeCreateInternal(
            employee_id=scope_in.employee_id,
            department_id=scope_in.department_id,
            start_date=scope_in.start_date,
            end_date=scope_in.end_date,
            employee_user_group_link_id=link.id,
        )
        created = await self.create(internal)
        record = await self.repository.get_by_id_with_rels(created.id)
        schema = self._to_schema(record)
        detail = await self._resolve_domain_success(
            HrmScopeCreateSuccess(schema.department_name or str(schema.department_id))
        )
        return MutationResponse(detail=detail, data=schema)

    async def update_scope(
        self, scope_id: int, scope_in: HrmScopeUpdate
    ) -> MutationResponse[HrmScopeSchema]:
        record = await self.repository.get_by_id_with_rels(scope_id)
        if not record:
            raise await self._resolve_domain_error(HrmScopeNotFound(scope_id))

        new_start = scope_in.start_date or record.start_date
        new_end = scope_in.end_date or record.end_date
        if new_start > new_end:
            raise await self._resolve_domain_error(HrmScopeStartAfterEnd())

        updated = await self.update(scope_id, scope_in)
        record = await self.repository.get_by_id_with_rels(updated.id)
        schema = self._to_schema(record)
        detail = await self._resolve_domain_success(
            HrmScopeUpdateSuccess(schema.department_name or str(schema.department_id))
        )
        return MutationResponse(detail=detail, data=schema)

    async def delete_scope(self, scope_id: int) -> None:
        record = await self.repository.get_by_id_with_rels(scope_id)
        if not record:
            raise await self._resolve_domain_error(HrmScopeNotFound(scope_id))
        name = record.department.name if record.department else str(record.department_id)
        await self.delete_by_id(
            scope_id,
            name=name,
            delete_error_exc=HrmScopeDeleteError,
            delete_success_exc=HrmScopeDeleteSuccess,
        )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _is_active(start: date, end: date) -> bool:
        today = date.today()
        return start <= today <= end

    def _to_schema(self, record) -> HrmScopeSchema:
        schema = HrmScopeSchema.model_validate(record)
        dept = record.department
        cat = dept.department_category if dept else None
        setattr(schema, "employee_code", record.employee.code if record.employee else None)
        setattr(schema, "employee_name", record.employee.name if record.employee else None)
        setattr(schema, "department_name", dept.name if dept else None)
        setattr(schema, "department_category_id", cat.id if cat else None)
        setattr(schema, "department_category_name", cat.name if cat else None)
        setattr(
            schema,
            "is_currently_active",
            self._is_active(record.start_date, record.end_date),
        )
        return schema

    async def _get_hrm_employee_or_raise(self, employee_id: int):
        """Return (employee, hrm_link) or raise. hrm_link is the
        EmployeeUserGroupLink row whose user_group is the HRM group."""
        from backend.api_v1.employee.employee_model import Employee
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload
        from backend.api_v1.table_relationship_links.employee_user_group_link_model import (
            EmployeeUserGroupLink,
        )

        stmt = (
            select(Employee)
            .where(Employee.id == employee_id)
            .options(
                selectinload(Employee.user_groups).selectinload(
                    EmployeeUserGroupLink.user_group
                )
            )
        )
        emp = (await self.session.execute(stmt)).scalar_one_or_none()
        if not emp:
            raise await self._resolve_domain_error(HrmScopeNotFound(employee_id))

        hrm_link = next(
            (
                link
                for link in emp.user_groups
                if link.user_group and link.user_group.name == HRM_GROUP_NAME
            ),
            None,
        )
        if hrm_link is None:
            raise await self._resolve_domain_error(
                HrmScopeEmployeeNotHrm(emp.name)
            )
        return emp, hrm_link
