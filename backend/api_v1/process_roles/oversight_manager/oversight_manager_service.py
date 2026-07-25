
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.department.department_model import Department
from backend.api_v1.employee.employee_model import Employee
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee_department.employee_department_model import EmployeeDepartment
from backend.api_v1.job_process_role_link.job_process_role_link_model import JobProcessRoleLink
from backend.api_v1.process_roles.oversight_manager.oversight_manager_messages import (
    OversightHolderInvalid,
    OversightManagerClearSuccess,
    OversightManagerSelf,
    OversightManagerSetSuccess,
    OversightRoleNotConfigured,
)
from backend.api_v1.process_roles.oversight_manager.oversight_manager_schema import (
    MyOversightManager,
    OversightManagerOption,
    SetOversightManager,
)
from backend.api_v1.process_roles.process.process_model import Process
from backend.api_v1.process_roles.process_role.process_role_model import ProcessRole
from backend.api_v1.process_roles.process_role_holder.process_role_holder_model import (
    ProcessRoleHolder,
)
from backend.api_v1.process_roles.process_role_holder.process_role_holder_repository import (
    ProcessRoleHolderRepository,
)
from backend.api_v1.process_roles.process_role_holder_employee_link.process_role_holder_employee_link_model import (
    ProcessRoleHolderEmployeeLink,
)
from backend.api_v1.process_roles.process_role_holder_employee_link.process_role_holder_employee_link_repository import (
    ProcessRoleHolderEmployeeLinkRepository,
)

# Self-service "pick my oversight manager" within people-review. The oversight role
# is the people_review process role(s) with link_target='employee' (the same roster
# concept the admin assigns). Candidates are EXISTING holders only — the employee
# cannot create a new reviewer here.
PEOPLE_REVIEW_PROCESS_KEY = "people_review"


class OversightManagerService(BaseService):
    def __init__(
        self,
        repository: ProcessRoleHolderEmployeeLinkRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, user=user, session=session)
        self.holder_repository = ProcessRoleHolderRepository(session=session)

    async def _oversight_role_ids(self) -> list[int]:
        """Active people_review roles whose holders are linked to employees
        (link_target='employee') — i.e. the 'oversight' roles. Realistically one;
        querying as a set keeps it correct if more than one is ever configured."""
        stmt = (
            select(ProcessRole.id)
            .join(Process, ProcessRole.process_id == Process.id)
            .where(
                Process.key == PEOPLE_REVIEW_PROCESS_KEY,
                ProcessRole.link_target == "employee",
                ProcessRole.is_active == True,
            )
        )
        result = await self.session.scalars(stmt)
        return list(result.all())

    async def get_candidate_managers(
        self, short: bool = False
    ) -> list[OversightManagerOption]:
        """Existing oversight reviewers the user may pick, excluding themselves.

        When ``short=True``, the list is built directly from employees whose main
        department falls within the user's branch (own department + parent +
        siblings) AND whose job is linked to the oversight role. Holder records
        are auto-created for qualified employees who don't have one yet."""
        role_ids = await self._oversight_role_ids()
        if not role_ids:
            return []

        if short:
            return await self._build_short_list(role_ids)

        # Full list: all existing oversight holders (excluding self).
        stmt = (
            select(ProcessRoleHolder)
            .where(
                ProcessRoleHolder.process_role_id.in_(role_ids),
                ProcessRoleHolder.holder_employee_id != self.user.id,
            )
            .order_by(ProcessRoleHolder.id)
        )
        holders = (await self.session.scalars(stmt)).all()
        return [
            OversightManagerOption(
                process_role_holder_id=h.id,
                holder_employee_id=h.holder_employee_id,
                holder_code=h.holder_code,
                holder_name=h.holder_name,
                role_name=h.role_name,
            )
            for h in holders
        ]

    async def _build_short_list(
        self, oversight_role_ids: list[int]
    ) -> list[OversightManagerOption]:
        """Build the short list from employees (not existing holders). Finds
        employees whose main department falls within the user's branch AND whose
        job is linked to oversight. Auto-creates ProcessRoleHolder records for
        qualified employees who don't have one yet."""

        # 1. Get current user's main department
        main_dept = await self.session.scalar(
            select(EmployeeDepartment).where(
                EmployeeDepartment.employee_id == self.user.id,
            )
        )
        if not main_dept:
            return []  # User has no main department → no short list possible

        department_ids = {main_dept.department_id}

        # 2. Get parent + sibling departments
        parent_dept_id = await self.session.scalar(
            select(Department.parent_id).where(
                Department.id == main_dept.department_id,
            )
        )
        if parent_dept_id is not None:
            department_ids.add(parent_dept_id)
            sibling_ids_result = await self.session.scalars(
                select(Department.id).where(
                    Department.parent_id == parent_dept_id,
                )
            )
            department_ids.update(sibling_ids_result.all())

        # 3. Find employees whose main department is in department_ids
        employee_ids_in_scope_result = await self.session.scalars(
            select(EmployeeDepartment.employee_id).where(
                EmployeeDepartment.department_id.in_(department_ids),
            )
        )
        employee_ids_in_scope = set(employee_ids_in_scope_result.all())
        if not employee_ids_in_scope:
            return []

        # 4. Among those, find employees whose job is linked to oversight
        job_linked_result = await self.session.scalars(
            select(Employee.id)
            .join(JobProcessRoleLink, Employee.job_id == JobProcessRoleLink.job_id)
            .where(
                Employee.id.in_(employee_ids_in_scope),
                JobProcessRoleLink.process_role_id.in_(oversight_role_ids),
            )
        )
        qualified_employee_ids = set(job_linked_result.all())
        # Exclude self
        qualified_employee_ids.discard(self.user.id)
        if not qualified_employee_ids:
            return []

        # 5. For each qualified employee, ensure a ProcessRoleHolder exists.
        #    Use the first oversight role_id (typically there is just one).
        first_role_id = oversight_role_ids[0]
        options: list[OversightManagerOption] = []

        for emp_id in qualified_employee_ids:
            holder = await self._ensure_holder(emp_id, first_role_id)
            if holder:
                options.append(
                    OversightManagerOption(
                        process_role_holder_id=holder.id,
                        holder_employee_id=holder.holder_employee_id,
                        holder_code=holder.holder_code,
                        holder_name=holder.holder_name,
                        role_name=holder.role_name,
                    )
                )

        # Commit so the auto-created holders survive for the subsequent
        # set_my_oversight_manager PUT request.
        await self.session.commit()

        # Sort by holder name for stable UI ordering
        options.sort(key=lambda o: o.holder_name or o.holder_code or "")
        return options

    async def _ensure_holder(
        self, employee_id: int, process_role_id: int
    ) -> ProcessRoleHolder | None:
        """Return the existing ProcessRoleHolder for (role, employee) or create
        one if it doesn't exist. Returns None if the employee doesn't exist."""
        existing = await self.session.scalar(
            select(ProcessRoleHolder).where(
                ProcessRoleHolder.process_role_id == process_role_id,
                ProcessRoleHolder.holder_employee_id == employee_id,
            )
        )
        if existing:
            return existing

        # Verify the employee exists
        emp = await self.session.scalar(
            select(Employee).where(Employee.id == employee_id)
        )
        if not emp:
            return None

        holder = ProcessRoleHolder(
            process_role_id=process_role_id,
            holder_employee_id=employee_id,
            assigned_by=self.user.id,
        )
        self.session.add(holder)
        await self.session.flush()
        # Refresh to load relationships (holder, assigner names)
        await self.session.refresh(holder)
        return holder

    async def get_my_manager(self) -> MyOversightManager | None:
        """The current user's chosen oversight manager (their single oversight
        link), or None when they have not picked one."""
        role_ids = await self._oversight_role_ids()
        if not role_ids:
            return None
        link = await self.session.scalar(
            select(ProcessRoleHolderEmployeeLink).where(
                ProcessRoleHolderEmployeeLink.employee_id == self.user.id,
                ProcessRoleHolderEmployeeLink.process_role_id.in_(role_ids),
            )
        )
        if link is None:
            return None
        holder = await self.holder_repository.get_by_id(link.process_role_holder_id)
        return MyOversightManager(
            link_id=link.id,
            process_role_holder_id=link.process_role_holder_id,
            holder_employee_id=holder.holder_employee_id if holder else 0,
            holder_code=holder.holder_code if holder else None,
            holder_name=holder.holder_name if holder else None,
        )

    async def set_my_manager(
        self, payload: SetOversightManager
    ) -> MutationResponse[MyOversightManager]:
        """Set (or replace) the current user's oversight manager. The chosen holder
        must be an existing oversight holder and not the user themselves. The unique
        (process_role_id, employee_id) constraint allows one oversight manager per
        employee, so any prior oversight link of the user is replaced."""
        role_ids = await self._oversight_role_ids()
        if not role_ids:
            raise await self._resolve_domain_error(OversightRoleNotConfigured())

        holder = await self.holder_repository.get_by_id(payload.process_role_holder_id)
        if holder is None or holder.process_role_id not in role_ids:
            raise await self._resolve_domain_error(
                OversightHolderInvalid(payload.process_role_holder_id)
            )
        if holder.holder_employee_id == self.user.id:
            raise await self._resolve_domain_error(OversightManagerSelf())

        # Drop any existing oversight link(s) for self, then create the chosen one.
        existing = (
            await self.session.scalars(
                select(ProcessRoleHolderEmployeeLink).where(
                    ProcessRoleHolderEmployeeLink.employee_id == self.user.id,
                    ProcessRoleHolderEmployeeLink.process_role_id.in_(role_ids),
                )
            )
        ).all()
        for link in existing:
            await self.session.delete(link)
        # Emit the deletes before inserting so we don't trip the unique slot.
        await self.session.flush()

        new_link = ProcessRoleHolderEmployeeLink(
            process_role_holder_id=holder.id,
            process_role_id=holder.process_role_id,  # derived from holder, never client
            employee_id=self.user.id,
        )
        self.session.add(new_link)
        await self.session.commit()
        await self.session.refresh(new_link)

        data = MyOversightManager(
            link_id=new_link.id,
            process_role_holder_id=holder.id,
            holder_employee_id=holder.holder_employee_id,
            holder_code=holder.holder_code,
            holder_name=holder.holder_name,
        )
        label = (
            holder.holder_name or holder.holder_code or str(holder.holder_employee_id)
        )
        detail = await self._resolve_domain_success(OversightManagerSetSuccess(label))
        return MutationResponse(detail=detail, data=data)

    async def clear_my_manager(self) -> MutationResponse[None]:
        """Disconnect the current user's oversight manager (delete their oversight
        link, if any). Idempotent — succeeds even when nothing was set."""
        role_ids = await self._oversight_role_ids()
        if role_ids:
            existing = (
                await self.session.scalars(
                    select(ProcessRoleHolderEmployeeLink).where(
                        ProcessRoleHolderEmployeeLink.employee_id == self.user.id,
                        ProcessRoleHolderEmployeeLink.process_role_id.in_(role_ids),
                    )
                )
            ).all()
            for link in existing:
                await self.session.delete(link)
            await self.session.commit()
        detail = await self._resolve_domain_success(OversightManagerClearSuccess())
        return MutationResponse(detail=detail, data=None)
