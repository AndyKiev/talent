from typing import Optional, List

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.process_roles.process_role_holder_employee_link.process_role_holder_employee_link_repository import (
    ProcessRoleHolderEmployeeLinkRepository,
)
from backend.api_v1.process_roles.process_role_holder_employee_link.process_role_holder_employee_link_model import (
    ProcessRoleHolderEmployeeLink as ProcessRoleHolderEmployeeLinkModel,
)
from backend.api_v1.process_roles.process_role_holder_employee_link.process_role_holder_employee_link_schema import (
    ProcessRoleHolderEmployeeLink as ProcessRoleHolderEmployeeLinkSchema,
    ProcessRoleHolderEmployeeLinkCreate,
)
from backend.api_v1.process_roles.process_role_holder.process_role_holder_model import (
    ProcessRoleHolder,
)
from backend.api_v1.process_roles.process_role.process_role_model import ProcessRole
from backend.api_v1.process_roles.process.process_model import Process
from backend.api_v1.process_roles.process_role_holder.process_role_holder_repository import (
    ProcessRoleHolderRepository,
)
from backend.api_v1.process_roles.process_role_holder.process_role_holder_errors import (
    ProcessRoleHolderNotFound,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.process_roles.process_role_holder_employee_link.process_role_holder_employee_link_errors import (
    ProcessRoleHolderEmployeeNotFound,
    ProcessRoleHolderEmployeeExists,
    ProcessRoleHolderEmployeeSelf,
    ProcessRoleHolderEmployeeDeleteError,
)
from backend.api_v1.process_roles.process_role_holder_employee_link.process_role_holder_employee_link_success import (
    ProcessRoleHolderEmployeeCreateSuccess,
    ProcessRoleHolderEmployeeDeleteSuccess,
    ProcessRoleHolderEmployeeOrderSuccess,
)


class ProcessRoleHolderEmployeeLinkService(BaseService):
    def __init__(
        self,
        repository: ProcessRoleHolderEmployeeLinkRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)
        self.holder_repository = ProcessRoleHolderRepository(session=session)

    async def get_by_id(self, id: int) -> ProcessRoleHolderEmployeeLinkSchema:
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(
                ProcessRoleHolderEmployeeNotFound(id)
            )
        return result

    async def get_roster_employee_ids(
        self,
        holder_employee_id: int,
        process_key: str,
        role_key: str,
    ) -> set[int]:
        """Roster resolver (§5/§9): employees `holder_employee_id` covers for a
        given process+role. Matches on stable keys. The single entry point a
        consuming module uses to scope visibility to a reviewer's roster."""
        return await self.repository.get_roster_employee_ids(
            holder_employee_id, process_key, role_key
        )

    async def get_holder_id(
        self, holder_employee_id: int, process_key: str, role_key: str
    ) -> Optional[int]:
        """The ProcessRoleHolder id for a given holder employee + process/role
        (stable keys). Used to resolve which roster's order_position to read/write
        when a reviewer reorders from inside a people-review session."""
        stmt = (
            select(ProcessRoleHolder.id)
            .join(ProcessRole, ProcessRoleHolder.process_role_id == ProcessRole.id)
            .join(Process, ProcessRole.process_id == Process.id)
            .where(
                ProcessRoleHolder.holder_employee_id == holder_employee_id,
                ProcessRole.key == role_key,
                Process.key == process_key,
            )
        )
        return await self.session.scalar(stmt)

    async def get_employee_order_map(self, holder_id: int) -> dict[int, int]:
        """{employee_id: order_position} for one holder's roster, skipping links
        with no stored position. The single ordering the session view sorts by."""
        rows = (
            await self.session.scalars(
                select(ProcessRoleHolderEmployeeLinkModel).where(
                    ProcessRoleHolderEmployeeLinkModel.process_role_holder_id
                    == holder_id
                )
            )
        ).all()
        return {
            r.employee_id: r.order_position
            for r in rows
            if r.order_position is not None
        }

    async def set_session_order(
        self, holder_id: int, ordered_employee_ids: List[int]
    ) -> None:
        """Write a session reorder into the holder's single roster order (shared
        with the admin screen). Commits."""
        await self._renumber_holder_links(holder_id, ordered_employee_ids)
        await self.session.commit()

    async def get_links(
        self,
        process_role_holder_id: Optional[int] = None,
        process_role_id: Optional[int] = None,
        employee_id: Optional[int] = None,
        sort: Optional[str] = None,
    ) -> List[ProcessRoleHolderEmployeeLinkSchema]:
        filters = {}
        if process_role_holder_id is not None:
            filters["process_role_holder_id"] = process_role_holder_id
        if process_role_id is not None:
            filters["process_role_id"] = process_role_id
        if employee_id is not None:
            filters["employee_id"] = employee_id
        records = await self.get_all(params=filters or None, sort_json=sort)
        if not sort:
            # Default = roster presentation order: stored positions first (asc),
            # then the unordered remainder by id. NULL position sorts last, so a
            # newly-assigned employee lands at the end of the roster.
            records = sorted(
                records,
                key=lambda r: (
                    r.order_position is None,
                    r.order_position or 0,
                    r.id,
                ),
            )
        return [ProcessRoleHolderEmployeeLinkSchema.model_validate(r) for r in records]

    async def _renumber_holder_links(
        self, process_role_holder_id: int, ordered_employee_ids: List[int]
    ) -> None:
        """Renumber one holder's roster links (10, 20, 30 …) so that the employees
        in `ordered_employee_ids` come first in that exact order, followed by any
        remaining roster members keeping their previous relative order.

        This is the single source of truth for the per-holder roster order, shared
        by the admin reviewer screen and the people-review session queue — there is
        ONE order per reviewer, shown everywhere. Reordering a session (a subset of
        the roster) places those people at the front without scrambling roster
        members who aren't enrolled in that session. Does NOT commit."""
        rows = (
            await self.session.scalars(
                select(ProcessRoleHolderEmployeeLinkModel).where(
                    ProcessRoleHolderEmployeeLinkModel.process_role_holder_id
                    == process_role_holder_id
                )
            )
        ).all()
        by_employee = {r.employee_id: r for r in rows}

        # Listed employees first (dedup, only ones that belong to this holder),
        # then the remaining roster members in their current stored order.
        front: List[int] = []
        seen: set[int] = set()
        for emp_id in ordered_employee_ids:
            if emp_id in by_employee and emp_id not in seen:
                front.append(emp_id)
                seen.add(emp_id)
        remaining = sorted(
            (r for r in rows if r.employee_id not in seen),
            key=lambda r: (r.order_position is None, r.order_position or 0, r.id),
        )

        position = 0
        for emp_id in front:
            position += 10
            by_employee[emp_id].order_position = position
        for row in remaining:
            position += 10
            row.order_position = position

    async def set_order(
        self, process_role_holder_id: int, ordered_ids: List[int]
    ) -> MutationResponse[None]:
        """Admin reviewer screen: reorder a holder's whole roster (payload is LINK
        ids). Maps link ids -> employee ids and delegates to the shared renumber so
        the order matches what the session queue uses."""
        rows = (
            await self.session.scalars(
                select(ProcessRoleHolderEmployeeLinkModel).where(
                    ProcessRoleHolderEmployeeLinkModel.process_role_holder_id
                    == process_role_holder_id
                )
            )
        ).all()
        link_to_emp = {r.id: r.employee_id for r in rows}
        ordered_employee_ids = [
            link_to_emp[lid] for lid in ordered_ids if lid in link_to_emp
        ]
        await self._renumber_holder_links(process_role_holder_id, ordered_employee_ids)
        await self.session.commit()

        detail = await self._resolve_domain_success(
            ProcessRoleHolderEmployeeOrderSuccess()
        )
        return MutationResponse(detail=detail, data=None)

    async def create_link(
        self, link_in: ProcessRoleHolderEmployeeLinkCreate
    ) -> MutationResponse[ProcessRoleHolderEmployeeLinkSchema]:
        holder = await self.holder_repository.get_by_id(link_in.process_role_holder_id)
        if not holder:
            raise await self._resolve_domain_error(
                ProcessRoleHolderNotFound(link_in.process_role_holder_id)
            )
        # no self-review: a holder cannot be assigned to themselves
        if link_in.employee_id == holder.holder_employee_id:
            raise await self._resolve_domain_error(ProcessRoleHolderEmployeeSelf())

        data = link_in.model_dump()
        data["process_role_id"] = (
            holder.process_role_id
        )  # set from holder, never client
        try:
            record = await self.create_from_dict(data)
            fresh = await self.repository.get_by_id(record.id)
            schema = ProcessRoleHolderEmployeeLinkSchema.model_validate(fresh)
            label = (
                schema.employee_name or schema.employee_code or str(schema.employee_id)
            )
            detail = await self._resolve_domain_success(
                ProcessRoleHolderEmployeeCreateSuccess(label)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                ProcessRoleHolderEmployeeExists(str(link_in.employee_id))
            )

    async def delete_link(self, link_id: int) -> None:
        record = await self.get_by_id(link_id)
        label = record.employee_name or record.employee_code or str(record.employee_id)
        await self.delete_by_id(
            link_id,
            name=label,
            delete_error_exc=ProcessRoleHolderEmployeeDeleteError,
            delete_success_exc=ProcessRoleHolderEmployeeDeleteSuccess,
        )
