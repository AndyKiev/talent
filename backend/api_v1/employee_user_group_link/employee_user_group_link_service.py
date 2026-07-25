# backend/api_v1/employee_user_group_link/employee_user_group_link_service.py

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee_user_group_link.employee_user_group_link_messages import (
    EmployeeEmailRequiredForGroup,
    EmployeeUserGroupLinkAlreadyExists,
    EmployeeUserGroupLinkCreateSuccess,
    EmployeeUserGroupLinkDeleteError,
    EmployeeUserGroupLinkDeleteSuccess,
    EmployeeUserGroupLinkNotFound,
    EmployeeUserGroupLinkNotFoundByCompositeKey,
)
from backend.api_v1.employee_user_group_link.employee_user_group_link_repository import (
    EmployeeUserGroupLinkRepository,
)
from backend.api_v1.employee_user_group_link.employee_user_group_link_schema import (
    EmployeeUserGroupLink as EmployeeUserGroupLinkSchema,
)
from backend.api_v1.employee_user_group_link.employee_user_group_link_schema import (
    EmployeeUserGroupLinkCreate,
    EmployeeWithGroups,
    GroupOfType,
)


class EmployeeUserGroupLinkService(BaseService):
    def __init__(
        self,
        repository: EmployeeUserGroupLinkRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, user=user, session=session)

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    async def get_by_id(self, link_id: int) -> EmployeeUserGroupLinkSchema:
        result = await self.repository.get_by_id(link_id)
        if not result:
            raise await self._resolve_domain_error(
                EmployeeUserGroupLinkNotFound(link_id)
            )
        return result

    async def get_by_composite_key(
        self, employee_id: int, user_group_id: int
    ) -> EmployeeUserGroupLinkSchema:
        result = await self.repository.get_by_composite_key(employee_id, user_group_id)
        if not result:
            raise await self._resolve_domain_error(
                EmployeeUserGroupLinkNotFoundByCompositeKey(employee_id, user_group_id)
            )
        return EmployeeUserGroupLinkSchema.model_validate(result)

    async def get_employee_groups(self, employee_id: int) -> list[GroupOfType]:
        """Groups attached to one employee, flattened with their type for the UI."""
        links = await self.repository.get_by_employee(employee_id)
        return [self._to_group_of_type(link) for link in links]

    async def get_employees_with_groups(self) -> list[EmployeeWithGroups]:
        """Build the Users grid payload: employee + email + groups-by-type."""
        employees = await self.repository.get_employees_with_groups()
        rows: list[EmployeeWithGroups] = []
        for emp in employees:
            groups = [
                self._to_group_of_type(link)
                for link in emp.user_groups
                if link.user_group
            ]
            rows.append(
                EmployeeWithGroups(
                    id=emp.id,
                    code=emp.code,
                    name=emp.name,
                    email=emp.email,
                    job_name=emp.job.name if emp.job else None,
                    groups=groups,
                )
            )
        return rows

    @staticmethod
    def _to_group_of_type(link) -> GroupOfType:
        ug = link.user_group
        ugt = ug.user_group_type if ug else None
        return GroupOfType(
            link_id=link.id,
            group_id=ug.id,
            group_name=ug.name,
            user_group_type_id=ug.user_group_type_id,
            user_group_type_name=ugt.name if ugt else None,
        )

    def _link_label(self, link: EmployeeUserGroupLinkSchema) -> str:
        return link.user_group.name if link.user_group else str(link.user_group_id)

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    async def create_link(
        self, link_in: EmployeeUserGroupLinkCreate
    ) -> MutationResponse[EmployeeUserGroupLinkSchema]:
        # Guard 1: employee must have an email (mailing depends on it)
        employee = await self._get_employee_or_raise(link_in.employee_id)
        if not employee.email:
            raise await self._resolve_domain_error(
                EmployeeEmailRequiredForGroup(employee.name)
            )

        # Guard 2: unique pair
        existing = await self.repository.get_by_composite_key(
            link_in.employee_id, link_in.user_group_id
        )
        if existing:
            raise await self._resolve_domain_error(
                EmployeeUserGroupLinkAlreadyExists(
                    link_in.employee_id, link_in.user_group_id
                )
            )
        try:
            created = await self.create(link_in)
            # Re-fetch so user_group (+ type) relationship is loaded for the label/response
            record = await self.repository.get_by_id(created.id)
            schema = EmployeeUserGroupLinkSchema.model_validate(record)
            detail = await self._resolve_domain_success(
                EmployeeUserGroupLinkCreateSuccess(self._link_label(schema))
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                EmployeeUserGroupLinkAlreadyExists(
                    link_in.employee_id, link_in.user_group_id
                )
            )

    async def delete_link(self, link_id: int) -> None:
        record = await self.get_by_id(link_id)
        schema = EmployeeUserGroupLinkSchema.model_validate(record)
        # NOTE: any hrm_scopes hanging off this link are removed automatically by
        # the ON DELETE CASCADE FK (hrm_scopes.employee_user_group_link_id).
        # The frontend calls preview_link_deletion() first to warn the admin.
        await self.delete_by_id(
            link_id,
            name=self._link_label(schema),
            delete_error_exc=EmployeeUserGroupLinkDeleteError,
            delete_success_exc=EmployeeUserGroupLinkDeleteSuccess,
        )

    async def preview_link_deletion(self, link_id: int) -> dict:
        """
        Report what removing this group link will cascade-delete, so the UI can
        reconfirm. Currently only HRM scopes cascade off a link row.
        Returns: {"group_name": str, "hrm_scope_count": int}
        """
        from sqlalchemy import func, select

        from backend.api_v1.hrm_scope.hrm_scope_model import HrmScope

        record = await self.get_by_id(link_id)
        schema = EmployeeUserGroupLinkSchema.model_validate(record)

        count = int(
            (
                await self.session.execute(
                    select(func.count(HrmScope.id)).where(
                        HrmScope.employee_user_group_link_id == link_id
                    )
                )
            ).scalar()
            or 0
        )
        return {
            "group_name": self._link_label(schema),
            "hrm_scope_count": count,
        }

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    async def _get_employee_or_raise(self, employee_id: int):
        from backend.api_v1.employee.employee_model import Employee

        emp = await self.session.get(Employee, employee_id)
        if not emp:
            raise await self._resolve_domain_error(
                EmployeeUserGroupLinkNotFound(employee_id)
            )
        return emp
