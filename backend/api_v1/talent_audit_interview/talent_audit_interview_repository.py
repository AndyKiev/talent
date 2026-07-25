from collections.abc import Sequence

from sqlalchemy import select

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.talent_audit_interview.talent_audit_interview_model import (
    TalentAuditInterview,
)


class TalentAuditInterviewRepository(BaseRepository):
    model = TalentAuditInterview

    async def get_by_talent_audit_job_id(
        self, talent_audit_job_id: int
    ) -> Sequence[TalentAuditInterview]:
        """Return all interviews for a given talent audit job."""
        stmt = select(TalentAuditInterview).where(
            TalentAuditInterview.talent_audit_job_id == talent_audit_job_id
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()
