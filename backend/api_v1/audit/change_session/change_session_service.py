import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.audit.change_session.change_session_messages import (
    ChangeSessionNotFound,
)
from backend.api_v1.audit.change_session.change_session_repository import (
    ChangeSessionRepository,
)
from backend.api_v1.audit.change_session.change_session_schema import (
    ChangeRunStatus,
    ChangeSessionSchema,
    ChangeSource,
)
from backend.api_v1.base.base_service import BaseService
from backend.api_v1.employee.employee_schema import EmployeeSchema


class ChangeSessionService(BaseService):
    """
    Manages audit runs. Other services call `start_session` at the top of a unit
    of work, then write change_log rows under the returned session id.

    Transaction guidance:
      - Celery / bulk: call start_session(..., commit=True) so the run row is
        persisted BEFORE the per-item loop. Per-item rollbacks then never erase
        the run record. Call finish_session at the end with the outcome.
      - Manual single action: start_session(..., commit=False) and let the
        caller's existing apply commit flush the run + its log rows together.
    """

    def __init__(
        self,
        repository: ChangeSessionRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, user=user, session=session)

    # ── Reads ─────────────────────────────────────────────────────────────────

    async def get_by_id(self, session_id: int):
        record = await self.repository.get_by_id(session_id)
        if not record:
            raise await self._resolve_domain_error(ChangeSessionNotFound(session_id))
        return record

    async def get_change_sessions(
        self,
        source: str | None = None,
        status: str | None = None,
        limit: int | None = None,
    ) -> list[ChangeSessionSchema]:
        """
        Audit runs, newest first (by started_at, then id). Optional equality
        filters on `source` ('manual' | 'system') and `status`
        ('running' | 'success' | 'failed'); optional row cap via `limit`.
        """
        filters: dict = {}
        if source is not None:
            filters["source"] = source
        if status is not None:
            filters["status"] = status

        records = await self.get_all(params=filters or None)
        records = sorted(records, key=lambda r: (r.started_at, r.id), reverse=True)
        if limit is not None and limit > 0:
            records = records[:limit]
        return [ChangeSessionSchema.model_validate(r) for r in records]

    # ── Writes (called by other services) ──────────────────────────────────────

    async def start_session(
        self,
        source: ChangeSource,
        triggered_by_user_id: int | None = None,
        task_name: str | None = None,
        summary: dict | None = None,
        employee_id: int | None = None,
        commit: bool = False,
    ):
        """
        Open a run. Returns the ORM ChangeSession (with id populated).

        `employee_id` is the subject employee the run concerns (single manual
        actions); leave NULL for bulk/scheduled sweeps that span many employees.

        Pass commit=True for system/bulk runs so the row survives per-item
        rollbacks; commit=False to ride the caller's transaction.
        """
        instance = self.repository.model(
            source=source.value if isinstance(source, ChangeSource) else source,
            triggered_by_user_id=triggered_by_user_id,
            task_name=task_name,
            employee_id=employee_id,
            summary=summary,
        )
        if commit:
            return await self.repository.create(instance)
        self.session.add(instance)
        await self.session.flush()  # assign PK without committing
        return instance

    async def finish_session(
        self,
        session_id: int,
        status: ChangeRunStatus,
        summary: dict | None = None,
        commit: bool = True,
    ):
        """Close a run with an outcome (and optional aggregate summary)."""
        record = await self.get_by_id(session_id)
        record.status = status.value if isinstance(status, ChangeRunStatus) else status
        record.finished_at = datetime.datetime.now(datetime.UTC)
        if summary is not None:
            record.summary = summary
        if commit:
            await self.session.commit()
            await self.session.refresh(record)
        else:
            await self.session.flush()
        return record
