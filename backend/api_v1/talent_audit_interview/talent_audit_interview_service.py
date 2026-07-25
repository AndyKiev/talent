
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.talent_audit_interview.talent_audit_interview_messages import (
    TalentAuditInterviewCreateSuccess,
    TalentAuditInterviewDuplicatePeriod,
    TalentAuditInterviewNoFreeJobs,
    TalentAuditInterviewNotFound,
    TalentAuditInterviewPeriodsNotAscending,
    TalentAuditInterviewUpdateSuccess,
)
from backend.api_v1.talent_audit_interview.talent_audit_interview_repository import (
    TalentAuditInterviewRepository,
)
from backend.api_v1.talent_audit_interview.talent_audit_interview_schema import (
    TalentAuditInterview as TalentAuditInterviewSchema,
)
from backend.api_v1.talent_audit_interview.talent_audit_interview_schema import (
    TalentAuditInterviewCreate,
    TalentAuditInterviewUpdate,
)
from backend.api_v1.talent_audit_interview_job.talent_audit_interview_job_model import (
    TalentAuditInterviewJob,
)
from backend.api_v1.talent_audit_job.talent_audit_job_model import TalentAuditJob
from backend.api_v1.talent_audit_job_status.talent_audit_job_status_model import (
    TalentAuditJobStatus,
)
from backend.api_v1.talent_status_period_link.talent_status_period_link_model import (
    TalentStatusPeriodLink,
)

STATUS_KEY_CREATED = "created"
STATUS_KEY_CLOSED = "closed"


class TalentAuditInterviewService(BaseService):
    def __init__(
        self,
        repository: TalentAuditInterviewRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, user=user, session=session)

    # ------------------------------------------------------------------
    # Helpers — status
    # ------------------------------------------------------------------

    async def _get_status_id_by_key(self, key: str) -> int:
        stmt = select(TalentAuditJobStatus).where(TalentAuditJobStatus.key == key)
        result = await self.session.execute(stmt)
        status = result.scalar_one_or_none()
        if not status:
            raise ValueError(f"TalentAuditJobStatus with key='{key}' not found in DB")
        return status.id

    async def _set_audit_jobs_status(
        self, audit_job_ids: list[int], status_key: str
    ) -> None:
        status_id = await self._get_status_id_by_key(status_key)
        stmt = (
            update(TalentAuditJob)
            .where(TalentAuditJob.id.in_(audit_job_ids))
            .values(status_id=status_id)
        )
        await self.session.execute(stmt)

    # ------------------------------------------------------------------
    # Helpers — period resolution
    # ------------------------------------------------------------------

    async def _get_link_details(self, link_id: int) -> TalentStatusPeriodLink | None:
        """Get the full link with talent_period and talent_status loaded."""
        stmt = select(TalentStatusPeriodLink).where(
            TalentStatusPeriodLink.id == link_id
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def _validate_hrs_periods_ascending(
        self,
        job_assessments: list,
        free_jobs: list[TalentAuditJob],
    ) -> None:
        """
        Validate HRS assessments: qty_months must be strictly ascending
        and no duplicates across jobs.
        """
        # Build map: audit_job_id → free_job ORM
        free_map = {j.id: j for j in free_jobs}

        # Collect (qty_months, audit_job_id) for each assessment
        hrs_months = []
        for assessment in job_assessments:
            link = await self._get_link_details(assessment.talent_status_period_link_id)
            if not link or not link.talent_period:
                continue
            hrs_months.append(link.talent_period.qty_months)

        # Check duplicates
        if len(hrs_months) != len(set(hrs_months)):
            seen = set()
            for m in hrs_months:
                if m in seen:
                    raise await self._resolve_domain_error(
                        TalentAuditInterviewDuplicatePeriod(m)
                    )
                seen.add(m)

        # Check ascending
        for i in range(1, len(hrs_months)):
            if hrs_months[i] <= hrs_months[i - 1]:
                raise await self._resolve_domain_error(
                    TalentAuditInterviewPeriodsNotAscending(
                        hrs_months[i], hrs_months[i - 1]
                    )
                )

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    async def get_by_id(self, interview_id: int):
        record = await self.repository.get_by_id(interview_id)
        if not record:
            raise await self._resolve_domain_error(
                TalentAuditInterviewNotFound(interview_id)
            )
        return record

    async def get_by_talent_audit_id(
        self, talent_audit_id: int
    ) -> list[TalentAuditInterviewSchema]:
        records = await self.repository.get_all(
            filters={"talent_audit_id": talent_audit_id}
        )
        return [TalentAuditInterviewSchema.model_validate(r) for r in records]

    async def get_talent_audit_interviews(
        self, sort: str | None = None
    ) -> list[TalentAuditInterviewSchema]:
        records = await self.get_all(sort_json=sort)
        return [TalentAuditInterviewSchema.model_validate(r) for r in records]

    # ------------------------------------------------------------------
    # Helpers — free jobs
    # ------------------------------------------------------------------

    async def _get_free_audit_jobs(self, talent_audit_id: int) -> list[TalentAuditJob]:
        created_status_id = await self._get_status_id_by_key(STATUS_KEY_CREATED)
        stmt = (
            select(TalentAuditJob)
            .outerjoin(
                TalentAuditInterviewJob,
                TalentAuditInterviewJob.talent_audit_job_id == TalentAuditJob.id,
            )
            .where(
                TalentAuditJob.talent_audit_id == talent_audit_id,
                TalentAuditJob.status_id == created_status_id,
                TalentAuditInterviewJob.id.is_(None),
            )
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_free_audit_jobs_for_audit(self, talent_audit_id: int) -> list[dict]:
        jobs = await self._get_free_audit_jobs(talent_audit_id)
        result = []
        for j in jobs:
            link = j.talent_status_period_link
            qty_months = 0
            hrm_label = str(j.talent_status_period_link_id)
            hrm_status_key = ""
            if link and link.talent_status and link.talent_period:
                hrm_label = f"{link.talent_status.key} - {link.talent_period.name}"
                qty_months = link.talent_period.qty_months
                hrm_status_key = link.talent_status.key
            result.append(
                {
                    "id": j.id,
                    "target_job_id": j.target_job_id,
                    "job_name": (
                        j.target_job.name if j.target_job else str(j.target_job_id)
                    ),
                    "hrm_status_period_label": hrm_label,
                    "hrm_qty_months": qty_months,
                    "hrm_status_key": hrm_status_key,
                    "hrm_talent_status_period_link_id": j.talent_status_period_link_id,
                }
            )
        # Sort by qty_months ascending so frontend gets them in order
        result.sort(key=lambda x: x["hrm_qty_months"])
        return result

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    async def create_talent_audit_interview(
        self, interview_in: TalentAuditInterviewCreate
    ) -> MutationResponse[TalentAuditInterviewSchema]:
        free_jobs = await self._get_free_audit_jobs(interview_in.talent_audit_id)
        free_job_ids = {j.id for j in free_jobs}
        requested_job_ids = {
            a.talent_audit_job_id for a in interview_in.job_assessments
        }

        if not requested_job_ids:
            raise await self._resolve_domain_error(
                TalentAuditInterviewNoFreeJobs(interview_in.talent_audit_id)
            )

        invalid_ids = requested_job_ids - free_job_ids
        if invalid_ids:
            raise await self._resolve_domain_error(
                TalentAuditInterviewNoFreeJobs(interview_in.talent_audit_id)
            )

        # Validate HRS periods ascending + no duplicates
        await self._validate_hrs_periods_ascending(
            interview_in.job_assessments, free_jobs
        )

        try:
            user_id = self.user.id if self.user else 0

            interview_instance = self.repository.model(
                talent_audit_id=interview_in.talent_audit_id,
                status_id=interview_in.status_id,
                interview_date=interview_in.interview_date,
                created_by=user_id,
            )
            self.session.add(interview_instance)
            await self.session.flush()

            for assessment in interview_in.job_assessments:
                ij = TalentAuditInterviewJob(
                    talent_audit_interview_id=interview_instance.id,
                    talent_audit_job_id=assessment.talent_audit_job_id,
                    talent_status_period_link_id=assessment.talent_status_period_link_id,
                    created_by=user_id,
                )
                self.session.add(ij)

            await self._set_audit_jobs_status(
                list(requested_job_ids), STATUS_KEY_CLOSED
            )

            await self.session.commit()

            interview_loaded = await self.repository.get_by_id(interview_instance.id)
            schema = TalentAuditInterviewSchema.model_validate(interview_loaded)
            detail = await self._resolve_domain_success(
                TalentAuditInterviewCreateSuccess(schema.id)
            )
            return MutationResponse(detail=detail, data=schema)

        except IntegrityError:
            await self.session.rollback()
            raise await self._resolve_domain_error(
                TalentAuditInterviewNotFound(interview_in.talent_audit_id)
            )

    async def update_talent_audit_interview(
        self, interview_id: int, interview_update: TalentAuditInterviewUpdate
    ) -> MutationResponse[TalentAuditInterviewSchema]:
        orm_record = await self.get_by_id(interview_id)
        update_data = interview_update.model_dump(exclude_unset=True)
        updated = await self.repository.update(
            instance=orm_record,
            instance_update=update_data,
        )
        schema = TalentAuditInterviewSchema.model_validate(updated)
        detail = await self._resolve_domain_success(
            TalentAuditInterviewUpdateSuccess(schema.id)
        )
        return MutationResponse(detail=detail, data=schema)

    async def delete_talent_audit_interview(self, interview_id: int) -> None:
        interview = await self.get_by_id(interview_id)
        audit_job_ids = [
            ij.talent_audit_job_id for ij in (interview.interview_jobs or [])
        ]
        if audit_job_ids:
            await self._set_audit_jobs_status(audit_job_ids, STATUS_KEY_CREATED)
        await self.session.delete(interview)
        await self.session.commit()
