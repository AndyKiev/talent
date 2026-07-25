
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.audit.change_log.change_log_messages import ChangeLogNotFound
from backend.api_v1.audit.change_log.change_log_repository import ChangeLogRepository
from backend.api_v1.audit.change_log.change_log_schema import (
    ChangeAction,
    ChangeLogSchema,
)
from backend.api_v1.base.base_service import BaseService
from backend.api_v1.employee.employee_schema import EmployeeSchema


class ChangeLogService(BaseService):
    """
    Writes and reads individual mutation entries. Callers obtain a session id
    from ChangeSessionService.start_session, then record one entry per change.

    Cascade attribution: pass parent_id to link a derived change (e.g. a
    talent_audit_job status_change) to the entry that caused it (the
    employee_event 'apply'). Reversal later reads those children back.
    """

    def __init__(
        self,
        repository: ChangeLogRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, user=user, session=session)

    # ── Write ───────────────────────────────────────────────────────────────────

    async def log(
        self,
        change_session_id: int,
        essence_key: str,
        action: ChangeAction,
        entity_id: int | None = None,
        changes: dict | None = None,
        parent_id: int | None = None,
        employee_id: int | None = None,
        commit: bool = False,
    ):
        """
        Append one entry. Returns the ORM ChangeLog (id populated).

        `changes` is a field→{old,new} map, e.g.
          {"status_id": {"old": 3, "new": 5},
           "status_key": {"old": "created", "new": "applied"}}

        `employee_id` is the subject employee this entry concerns (set for
        employee_event entries so the UI can show who, even within bulk sweeps).

        commit=False (default) rides the caller's transaction; commit=True forces
        an immediate persist.
        """
        instance = self.repository.model(
            change_session_id=change_session_id,
            parent_id=parent_id,
            essence_key=essence_key,
            entity_id=entity_id,
            action=action.value if isinstance(action, ChangeAction) else action,
            changes=changes,
            employee_id=employee_id,
        )
        if commit:
            return await self.repository.create(instance)
        self.session.add(instance)
        await self.session.flush()  # assign PK so it can parent later rows
        return instance

    # ── Reads ─────────────────────────────────────────────────────────────────

    async def get_by_id(self, log_id: int):
        record = await self.repository.get_by_id(log_id)
        if not record:
            raise await self._resolve_domain_error(ChangeLogNotFound(log_id))
        return record

    async def get_logs(
        self,
        change_session_id: int | None = None,
        essence_key: str | None = None,
        entity_id: int | None = None,
        parent_id: int | None = None,
        action: str | None = None,
    ) -> list[ChangeLogSchema]:
        records = await self.repository.get_filtered(
            change_session_id=change_session_id,
            essence_key=essence_key,
            entity_id=entity_id,
            parent_id=parent_id,
            action=action,
        )
        return [ChangeLogSchema.model_validate(r) for r in records]

    async def get_children(self, parent_id: int) -> list[ChangeLogSchema]:
        """All entries caused by the given entry (for reversal/inspection)."""
        return await self.get_logs(parent_id=parent_id)

    async def get_apply_entry(
        self,
        essence_key: str,
        entity_id: int,
        action: str = ChangeAction.APPLY.value,
    ):
        """
        Latest ORM entry matching (essence_key, entity_id, action). Used by the
        future delete-reversal: find the employee_event 'apply' entry, then walk
        its children to restore statuses. Returns ORM row or None.
        """
        records = await self.repository.get_filtered(
            essence_key=essence_key,
            entity_id=entity_id,
            action=action,
        )
        return records[-1] if records else None
