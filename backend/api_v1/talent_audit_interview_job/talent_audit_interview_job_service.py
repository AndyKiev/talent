
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.talent_audit_interview_job.talent_audit_interview_job_messages import (
    TalentAuditInterviewJobDeleteError,
    TalentAuditInterviewJobDeleteSuccess,
    TalentAuditInterviewJobNotFound,
)
from backend.api_v1.talent_audit_interview_job.talent_audit_interview_job_repository import (
    TalentAuditInterviewJobRepository,
)
from backend.api_v1.talent_audit_interview_job.talent_audit_interview_job_schema import (
    TalentAuditInterviewJob as TalentAuditInterviewJobSchema,
)


class TalentAuditInterviewJobService(BaseService):
    def __init__(
        self,
        repository: TalentAuditInterviewJobRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, record_id: int):
        record = await self.repository.get_by_id(record_id)
        if not record:
            raise await self._resolve_domain_error(
                TalentAuditInterviewJobNotFound(record_id)
            )
        return record

    async def get_by_interview_id(
        self, interview_id: int
    ) -> list[TalentAuditInterviewJobSchema]:
        records = await self.repository.get_all(
            filters={"talent_audit_interview_id": interview_id}
        )
        return [TalentAuditInterviewJobSchema.model_validate(r) for r in records]

    async def delete_interview_job(self, record_id: int) -> None:
        await self.get_by_id(record_id)
        await self.delete_by_id(
            record_id,
            name=str(record_id),
            delete_error_exc=TalentAuditInterviewJobDeleteError,
            delete_success_exc=TalentAuditInterviewJobDeleteSuccess,
        )
