from typing import Optional

from sqlalchemy import select

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.talent_audit.talent_audit_model import TalentAudit


class TalentAuditRepository(BaseRepository):
    model = TalentAudit

    async def get_by_employee_id(self, employee_id: int) -> Optional[TalentAudit]:
        """Return the single audit record for a given employee."""
        stmt = select(TalentAudit).where(TalentAudit.employee_id == employee_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
