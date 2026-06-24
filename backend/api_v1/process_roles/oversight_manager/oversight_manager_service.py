from typing import Optional, List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.process_roles.process.process_model import Process
from backend.api_v1.process_roles.process_role.process_role_model import ProcessRole
from backend.api_v1.process_roles.process_role_holder.process_role_holder_model import (
    ProcessRoleHolder,
)
from backend.api_v1.process_roles.process_role_holder.process_role_holder_repository import (
    ProcessRoleHolderRepository,
)
from backend.api_v1.process_roles.process_role_holder_employee_link.process_role_holder_employee_link_repository import (
    ProcessRoleHolderEmployeeLinkRepository,
)
from backend.api_v1.process_roles.process_role_holder_employee_link.process_role_holder_employee_link_model import (
    ProcessRoleHolderEmployeeLink,
)
from backend.api_v1.process_roles.oversight_manager.oversight_manager_schema import (
    OversightManagerOption,
    MyOversightManager,
    SetOversightManager,
)
from backend.api_v1.process_roles.oversight_manager.oversight_manager_errors import (
    OversightRoleNotConfigured,
    OversightHolderInvalid,
    OversightManagerSelf,
)
from backend.api_v1.process_roles.oversight_manager.oversight_manager_success import (
    OversightManagerSetSuccess,
    OversightManagerClearSuccess,
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
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
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

    async def get_candidate_managers(self) -> List[OversightManagerOption]:
        """Existing oversight reviewers the user may pick, excluding themselves."""
        role_ids = await self._oversight_role_ids()
        if not role_ids:
            return []
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

    async def get_my_manager(self) -> Optional[MyOversightManager]:
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
