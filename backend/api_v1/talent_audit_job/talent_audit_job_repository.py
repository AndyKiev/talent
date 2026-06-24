from typing import Sequence

from sqlalchemy import select

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.talent_audit_job.talent_audit_job_model import TalentAuditJob


class TalentAuditJobRepository(BaseRepository):
    model = TalentAuditJob

    async def get_by_talent_audit_id(
        self, talent_audit_id: int
    ) -> Sequence[TalentAuditJob]:
        """Return all job entries for a given talent audit."""
        stmt = select(TalentAuditJob).where(
            TalentAuditJob.talent_audit_id == talent_audit_id
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()
