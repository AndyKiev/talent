from collections.abc import Sequence

from sqlalchemy import select

from backend.api_v1.audit.change_log.change_log_model import ChangeLog
from backend.api_v1.base.base_repository import BaseRepository


class ChangeLogRepository(BaseRepository):
    model = ChangeLog

    async def get_filtered(
        self,
        change_session_id: int | None = None,
        essence_key: str | None = None,
        entity_id: int | None = None,
        parent_id: int | None = None,
        action: str | None = None,
    ) -> Sequence[ChangeLog]:
        """
        Flexible read used for history views and reversal lookups:
          - children of an entry  → parent_id=<id>
          - all entries of a run  → change_session_id=<id>
          - the apply entry of E  → essence_key='employee_event', entity_id=E, action='apply'
        Ordered by id ascending (chronological).
        """
        conditions = []
        if change_session_id is not None:
            conditions.append(ChangeLog.change_session_id == change_session_id)
        if essence_key is not None:
            conditions.append(ChangeLog.essence_key == essence_key)
        if entity_id is not None:
            conditions.append(ChangeLog.entity_id == entity_id)
        if parent_id is not None:
            conditions.append(ChangeLog.parent_id == parent_id)
        if action is not None:
            conditions.append(ChangeLog.action == action)

        stmt = select(ChangeLog)
        if conditions:
            stmt = stmt.where(*conditions)
        stmt = stmt.order_by(ChangeLog.id.asc())

        result = await self.session.scalars(stmt)
        return result.all()
