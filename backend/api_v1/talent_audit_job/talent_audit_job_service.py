from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.talent_audit_job.talent_audit_job_errors import (
    TalentAuditJobDeleteError,
    TalentAuditJobNotFound,
    TalentAuditJobPeriodNotAscending,
    TalentAuditJobDuplicatePeriod,
    TalentAuditJobDuplicateJob,
)
from backend.api_v1.talent_audit_job.talent_audit_job_repository import (
    TalentAuditJobRepository,
)
from backend.api_v1.talent_audit_job.talent_audit_job_schema import (
    TalentAuditJob as TalentAuditJobSchema,
    TalentAuditJobCreate,
    TalentAuditJobUpdate,
)
from backend.api_v1.talent_audit_job.talent_audit_job_success import (
    TalentAuditJobCreateSuccess,
    TalentAuditJobDeleteSuccess,
    TalentAuditJobUpdateSuccess,
)
from backend.api_v1.talent_audit_job.talent_audit_job_model import TalentAuditJob
from backend.api_v1.talent_status_period_link.talent_status_period_link_model import (
    TalentStatusPeriodLink,
)


def _enrich(orm_record) -> dict:
    data = {}
    if hasattr(orm_record, "target_job") and orm_record.target_job:
        data["job_name"] = orm_record.target_job.name
    if hasattr(orm_record, "status") and orm_record.status:
        data["status_name"] = orm_record.status.name
    link = getattr(orm_record, "talent_status_period_link", None)
    if link and link.talent_status and link.talent_period:
        data["hrm_status_period_label"] = f"{link.talent_status.key} - {link.talent_period.name}"
    return data


def _to_schema(orm_record) -> TalentAuditJobSchema:
    extra = _enrich(orm_record)
    schema = TalentAuditJobSchema.model_validate(orm_record)
    for key, value in extra.items():
        setattr(schema, key, value)
    return schema


class TalentAuditJobService(BaseService):
    def __init__(
        self,
        repository: TalentAuditJobRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    async def _get_qty_months_for_link(self, link_id: int) -> int:
        """Resolve qty_months from talent_status_period_link → talent_period."""
        stmt = select(TalentStatusPeriodLink).where(TalentStatusPeriodLink.id == link_id)
        result = await self.session.execute(stmt)
        link = result.scalar_one_or_none()
        if not link or not link.talent_period:
            return 0
        return link.talent_period.qty_months

    async def _get_existing_audit_jobs(self, talent_audit_id: int) -> List[TalentAuditJob]:
        """Get all existing audit jobs for this audit via repository (selectin loaded)."""
        records = await self.repository.get_all(
            filters={"talent_audit_id": talent_audit_id}
        )
        return list(records)

    async def _validate_new_audit_job(
        self, talent_audit_id: int, target_job_id: int, new_link_id: int
    ) -> None:
        """
        Validate:
        1. target_job_id is not already used in this audit
        2. New job's qty_months is strictly greater than all existing
        3. No duplicate qty_months
        """
        existing_jobs = await self._get_existing_audit_jobs(talent_audit_id)

        # Check duplicate target job
        existing_job_ids = {j.target_job_id for j in existing_jobs}
        if target_job_id in existing_job_ids:
            raise await self._resolve_domain_error(
                TalentAuditJobDuplicateJob(target_job_id)
            )

        # Resolve new qty_months
        new_qty = await self._get_qty_months_for_link(new_link_id)

        # Collect existing qty_months
        existing_months = []
        for j in existing_jobs:
            link = j.talent_status_period_link
            if link and link.talent_period:
                existing_months.append(link.talent_period.qty_months)
        existing_months.sort()

        # Check duplicate qty_months
        if new_qty in existing_months:
            raise await self._resolve_domain_error(
                TalentAuditJobDuplicatePeriod(new_qty)
            )

        # Check ascending: new must be > max existing
        if existing_months and new_qty <= max(existing_months):
            raise await self._resolve_domain_error(
                TalentAuditJobPeriodNotAscending(new_qty, max(existing_months))
            )

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    async def get_by_id(self, job_id: int):
        record = await self.repository.get_by_id(job_id)
        if not record:
            raise await self._resolve_domain_error(TalentAuditJobNotFound(job_id))
        return record

    async def get_by_talent_audit_id(
        self, talent_audit_id: int
    ) -> List[TalentAuditJobSchema]:
        records = await self.repository.get_all(
            filters={"talent_audit_id": talent_audit_id}
        )
        return [_to_schema(r) for r in records]

    async def get_talent_audit_jobs(
        self, sort: Optional[str] = None
    ) -> List[TalentAuditJobSchema]:
        records = await self.get_all(sort_json=sort)
        return [_to_schema(r) for r in records]

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    async def create_talent_audit_job(
        self, job_in: TalentAuditJobCreate
    ) -> MutationResponse[TalentAuditJobSchema]:
        # Validate: no duplicate job, period ascending, no duplicate period
        await self._validate_new_audit_job(
            job_in.talent_audit_id,
            job_in.target_job_id,
            job_in.talent_status_period_link_id,
        )

        try:
            user_id = self.user.id if self.user else 0
            instance = self.repository.model(
                **job_in.model_dump(),
                created_by=user_id,
            )
            record = await self.repository.create(instance)
            schema = _to_schema(record)
            detail = await self._resolve_domain_success(
                TalentAuditJobCreateSuccess(schema.id)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                TalentAuditJobNotFound(job_in.talent_audit_id)
            )

    async def update_talent_audit_job(
        self, job_id: int, job_update: TalentAuditJobUpdate
    ) -> MutationResponse[TalentAuditJobSchema]:
        orm_record = await self.get_by_id(job_id)
        update_data = job_update.model_dump(exclude_unset=True)
        updated = await self.repository.update(
            instance=orm_record,
            instance_update=update_data,
        )
        schema = _to_schema(updated)
        detail = await self._resolve_domain_success(
            TalentAuditJobUpdateSuccess(schema.id)
        )
        return MutationResponse(detail=detail, data=schema)

    async def delete_talent_audit_job(self, job_id: int) -> None:
        await self.get_by_id(job_id)
        await self.delete_by_id(
            job_id,
            name=str(job_id),
            delete_error_exc=TalentAuditJobDeleteError,
            delete_success_exc=TalentAuditJobDeleteSuccess,
        )