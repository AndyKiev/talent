# backend/api_v1/employee/employee_service.py
from typing import List, Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.employee.employee_repository import EmployeeRepository
from backend.api_v1.employee.employee_schema import (
    EmployeeSchema,
    EmployeeCreate,
    EmployeeUpdate,
    EmployeePersonalDataUpdate,
    MainDepartmentSchema,
)
from backend.api_v1.employee.employee_errors import (
    EmployeeNotFound,
    EmployeeNotFoundByCode,
    EmployeeCodeTaken,
    EmployeeEmailTaken,
    EmployeeDeleteError,
)
from backend.api_v1.employee.employee_success import EmployeeDeleteSuccess
from backend.api_v1.base.errors import DomainError
from backend.auth.permission_resolvers import (
    resolve_user_permissions,
    resolve_user_permission_sets,
)


class EmployeeService(BaseService):
    def __init__(
        self,
        repository: EmployeeRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    # ------------------------------------------------------------------
    # Internal helper
    # ------------------------------------------------------------------

    async def _to_schema(self, orm_employee) -> EmployeeSchema:
        """Build a fully-populated EmployeeSchema from an ORM Employee instance."""
        operations = await self.repository.get_user_operations(orm_employee.id)
        schema = EmployeeSchema.model_validate(orm_employee)
        schema.operations = operations

        # Resolve essence-set access grants from the selectin-loaded user_groups.
        schema.permissions = resolve_user_permissions(orm_employee)
        schema.permission_sets = resolve_user_permission_sets(orm_employee)

        # Populate main_departments from the already selectin-loaded relationship.
        # Filter to is_main=True only; map to the slim MainDepartmentSchema.
        schema.main_departments = [
            MainDepartmentSchema(
                id=link.id,
                department_id=link.department_id,
                name=(
                    link.department.name
                    if link.department
                    else f"ID {link.department_id}"
                ),
            )
            for link in orm_employee.departments
            if link.is_main
        ]
        schema.extra_departments = [
            MainDepartmentSchema(
                id=link.id,
                department_id=link.department_id,
                name=(
                    link.department.name
                    if link.department
                    else f"ID {link.department_id}"
                ),
            )
            for link in orm_employee.departments
            if not link.is_main
        ]

        return schema

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    async def get_by_id(self, id: int) -> EmployeeSchema:
        result = await self.repository.get_by_id(id)
        if not result:
            exc = EmployeeNotFound(id)
            raise await self._resolve_domain_error(exc)
        return await self._to_schema(result)

    async def get_by_code(self, code: str) -> EmployeeSchema:
        result = await self.repository.get_by_code(code)
        if not result:
            exc = EmployeeNotFoundByCode(code)
            raise await self._resolve_domain_error(exc)
        return await self._to_schema(result)

    async def get_all(
        self, params: dict | None = None, **kwargs
    ) -> List[EmployeeSchema]:
        users = await self.repository.get_all(filters=params)
        return [await self._to_schema(u) for u in users]

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    async def create_user(self, user_in: EmployeeCreate) -> EmployeeSchema:
        if await self.repository.get_by_field("code", user_in.code.strip().upper()):
            exc = EmployeeCodeTaken(user_in.code)
            raise await self._resolve_domain_error(exc)
        if user_in.email and await self.repository.get_by_field("email", user_in.email):
            exc = EmployeeEmailTaken(user_in.email)
            raise await self._resolve_domain_error(exc)
        try:
            orm_user = await self.create(user_in)
            return await self._to_schema(orm_user)
        except IntegrityError:
            exc = EmployeeCodeTaken(user_in.code)
            raise await self._resolve_domain_error(exc)

    async def update_user(
        self, user_id: int, user_update: EmployeeUpdate
    ) -> EmployeeSchema:
        if user_update.email:
            existing = await self.repository.get_by_field("email", user_update.email)
            if existing and existing.id != user_id:
                exc = EmployeeEmailTaken(user_update.email)
                raise await self._resolve_domain_error(exc)
        try:
            orm_user = await self.repository.get_by_id(user_id)
            if not orm_user:
                exc = EmployeeNotFound(user_id)
                raise await self._resolve_domain_error(exc)
            updated = await self.update(orm_user, user_update, partial=True)
            return await self._to_schema(updated)
        except IntegrityError:
            exc = EmployeeEmailTaken(user_update.email or "")
            raise await self._resolve_domain_error(exc)

    async def set_current_level(self, user_id: int, level_id: int) -> EmployeeSchema:
        """Set the employee's current career level via the 1:1 link table."""
        try:
            orm_user = await self.repository.set_current_level(user_id, level_id)
            return await self._to_schema(orm_user)
        except DomainError as exc:
            raise await self._resolve_domain_error(exc)

    async def set_personal_data(
        self, user_id: int, data: "EmployeePersonalDataUpdate"
    ) -> EmployeeSchema:
        """Upsert the employee's personal data via the 1:1 table. Partial: only
        the fields actually provided are applied (birth_date and/or hire_date)."""
        fields = data.model_dump(exclude_unset=True)
        try:
            orm_user = await self.repository.set_personal_data(user_id, fields)
            return await self._to_schema(orm_user)
        except DomainError as exc:
            raise await self._resolve_domain_error(exc)

    async def delete_user(self, user_id: int) -> None:
        record = await self.get_by_id(user_id)
        await self.delete_by_id(
            user_id,
            name=record.name,
            delete_error_exc=EmployeeDeleteError,
            delete_success_exc=EmployeeDeleteSuccess,
        )

    # ------------------------------------------------------------------
    # Group management
    # ------------------------------------------------------------------

    async def add_to_group(self, user_id: int, user_group_id: int) -> EmployeeSchema:
        try:
            orm_user = await self.repository.add_to_group(user_id, user_group_id)
            return await self._to_schema(orm_user)
        except DomainError as exc:
            raise await self._resolve_domain_error(exc)

    async def remove_from_group(
        self, user_id: int, user_group_id: int
    ) -> EmployeeSchema:
        try:
            orm_user = await self.repository.remove_from_group(user_id, user_group_id)
            return await self._to_schema(orm_user)
        except DomainError as exc:
            raise await self._resolve_domain_error(exc)

    async def set_groups(
        self, user_id: int, user_group_ids: List[int]
    ) -> EmployeeSchema:
        try:
            orm_user = await self.repository.set_groups(user_id, user_group_ids)
            return await self._to_schema(orm_user)
        except DomainError as exc:
            raise await self._resolve_domain_error(exc)

    # ------------------------------------------------------------------
    # Job-group sync
    # ------------------------------------------------------------------

    async def sync_groups_from_job(self, employee_id: int) -> EmployeeSchema:
        try:
            orm_user, added, _ = await self.repository.sync_groups_from_job(employee_id)
            return await self._to_schema(orm_user)
        except DomainError as exc:
            raise await self._resolve_domain_error(exc)

    async def sync_job_users_groups(self, job_id: int) -> "SyncJobResult":
        employee_ids = await self.repository.get_employee_ids_by_job(job_id)
        total_employees = len(employee_ids)
        total_added = 0
        total_removed = 0
        for uid in employee_ids:
            try:
                _, added, removed = await self.repository.sync_groups_from_job(uid)
                total_added += added
                total_removed += removed
            except DomainError:
                pass
        return SyncJobResult(
            job_id=job_id,
            employees_processed=total_employees,
            links_added=total_added,
            links_removed=total_removed,
        )


# ------------------------------------------------------------------
# Response schemas for sync endpoints
# ------------------------------------------------------------------

from pydantic import BaseModel  # noqa: E402


class SyncUserResult(BaseModel):
    user_id: int
    links_added: int
    links_removed: int


class SyncJobResult(BaseModel):
    job_id: int
    employees_processed: int
    links_added: int
    links_removed: int


class SyncAllResult(BaseModel):
    jobs_processed: int
    employees_processed: int
    links_added: int
    links_removed: int
