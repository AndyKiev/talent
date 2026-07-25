
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.talent_status_period_link.talent_status_period_link_messages import (
    TalentStatusPeriodLinkAlreadyExists,
    TalentStatusPeriodLinkCreateSuccess,
    TalentStatusPeriodLinkDeleteError,
    TalentStatusPeriodLinkDeleteSuccess,
    TalentStatusPeriodLinkNotFound,
    TalentStatusPeriodLinkNotFoundByCompositeKey,
    TalentStatusPeriodLinkUpdateSuccess,
)
from backend.api_v1.talent_status_period_link.talent_status_period_link_repository import (
    TalentStatusPeriodLinkRepository,
)
from backend.api_v1.talent_status_period_link.talent_status_period_link_schema import (
    TalentStatusPeriodLink as TalentStatusPeriodLinkSchema,
)
from backend.api_v1.talent_status_period_link.talent_status_period_link_schema import (
    TalentStatusPeriodLinkCreate,
    TalentStatusPeriodLinkUpdate,
    TalentStatusPeriodLinkWithLabel,
)


def _link_label(status_name: str, period_name: str) -> str:
    """Human-readable label ("PO – 24") used in success/error messages."""
    return f"{status_name} – {period_name}"


class TalentStatusPeriodLinkService(BaseService):
    def __init__(
        self,
        repository: TalentStatusPeriodLinkRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int):
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(TalentStatusPeriodLinkNotFound(id))
        return result

    async def _link_label_by_ids(self, status_id: int, period_id: int) -> str:
        """Resolve a name-based link label from the status/period ids. Uses
        session.get (identity-map cached / by-PK) so it is safe to call after a
        commit, unlike lazy relationship access on an expired ORM instance."""
        from backend.api_v1.talent_period.talent_period_model import TalentPeriod
        from backend.api_v1.talent_status.talent_status_model import TalentStatus

        status = await self.session.get(TalentStatus, status_id)
        period = await self.session.get(TalentPeriod, period_id)
        return _link_label(
            status.name if status else str(status_id),
            period.name if period else str(period_id),
        )

    async def get_links(
        self,
        talent_period_id: int | None = None,
        talent_status_id: int | None = None,
        is_active: bool | None = None,
        sort: str | None = None,
    ) -> list[TalentStatusPeriodLinkSchema]:
        """
        Filtered list. Supports narrowing by period, status, or active flag.
        When talent_period_id or talent_status_id is given the dedicated
        repository queries are used; otherwise falls back to get_all with filters.
        """
        if talent_period_id is not None:
            records = await self.repository.get_by_period(talent_period_id)
        elif talent_status_id is not None:
            records = await self.repository.get_by_status(talent_status_id)
        else:
            filters = {}
            if is_active is not None:
                filters["is_active"] = is_active
            records = await self.get_all(params=filters or None, sort_json=sort)

        if is_active is not None and (talent_period_id or talent_status_id):
            records = [r for r in records if r.is_active == is_active]

        return [TalentStatusPeriodLinkSchema.model_validate(r) for r in records]

    async def get_active_pairs(
        self,
        is_active: bool | None = None,
    ) -> list[TalentStatusPeriodLinkWithLabel]:
        """
        Returns links with a computed label ("PO - 24") for use in select dropdowns.

        When is_active=True  → only rows where link.is_active, status.is_active,
                                and period.is_active are ALL True.
        When is_active=False → all rows (no filtering applied), so inactive
                                combinations are also visible for admin purposes.
        When is_active=None  → same as False: return everything.
        """
        records = await self.get_all(params=None, sort_json=None)

        if is_active is True:
            records = [
                r
                for r in records
                if r.is_active
                and r.talent_status is not None
                and r.talent_status.is_active
                and r.talent_period is not None
                and r.talent_period.is_active
            ]

        return [TalentStatusPeriodLinkWithLabel.model_validate(r) for r in records]

    async def create_link(
        self, link_in: TalentStatusPeriodLinkCreate
    ) -> MutationResponse[TalentStatusPeriodLinkSchema]:
        """Link a talent status to a talent period (duplicate pair is rejected)."""
        existing = await self.repository.get_by_composite_key(
            talent_period_id=link_in.talent_period_id,
            talent_status_id=link_in.talent_status_id,
        )
        if existing:
            raise await self._resolve_domain_error(
                TalentStatusPeriodLinkAlreadyExists(
                    existing.talent_status.name, existing.talent_period.name
                )
            )

        create_data = link_in.model_dump()
        if self.user:
            create_data["created_by"] = self.user.id

        try:
            from backend.api_v1.talent_status_period_link.talent_status_period_link_model import (
                TalentStatusPeriodLink,
            )

            instance = TalentStatusPeriodLink(**create_data)
            record = await self.repository.create(instance)
            schema = TalentStatusPeriodLinkSchema.model_validate(record)
            label = await self._link_label_by_ids(
                schema.talent_status_id, schema.talent_period_id
            )
            detail = await self._resolve_domain_success(
                TalentStatusPeriodLinkCreateSuccess(label)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            # Race: another request inserted the same pair between the pre-check
            # and our insert. The failed commit poisons the transaction, so roll
            # back before re-fetching the duplicate to build a name-based message.
            await self.session.rollback()
            dup = await self.repository.get_by_composite_key(
                talent_period_id=link_in.talent_period_id,
                talent_status_id=link_in.talent_status_id,
            )
            status_name = (
                dup.talent_status.name if dup else str(link_in.talent_status_id)
            )
            period_name = (
                dup.talent_period.name if dup else str(link_in.talent_period_id)
            )
            raise await self._resolve_domain_error(
                TalentStatusPeriodLinkAlreadyExists(status_name, period_name)
            )

    async def get_by_composite_key(
        self,
        talent_status_id: int,
        talent_period_id: int,
    ) -> TalentStatusPeriodLinkSchema:
        result = await self.repository.get_by_composite_key(
            talent_period_id=talent_period_id,
            talent_status_id=talent_status_id,
        )
        if not result:
            raise await self._resolve_domain_error(
                TalentStatusPeriodLinkNotFoundByCompositeKey(
                    talent_status_id, talent_period_id
                )
            )
        return result

    async def update_link(
        self, link_id: int, link_update: TalentStatusPeriodLinkUpdate
    ) -> MutationResponse[TalentStatusPeriodLinkSchema]:
        """Currently only is_active can be patched on an existing link."""
        orm_record = await self.get_by_id(link_id)
        updated = await self.update(orm_record, link_update, partial=True)
        schema = TalentStatusPeriodLinkSchema.model_validate(updated)
        label = await self._link_label_by_ids(
            schema.talent_status_id, schema.talent_period_id
        )
        detail = await self._resolve_domain_success(
            TalentStatusPeriodLinkUpdateSuccess(label)
        )
        return MutationResponse(detail=detail, data=schema)

    async def delete_link(self, link_id: int) -> None:
        """Unlink a talent status from a talent period."""
        record = await self.get_by_id(link_id)
        label = await self._link_label_by_ids(
            record.talent_status_id, record.talent_period_id
        )
        await self.delete_by_id(
            link_id,
            name=label,
            delete_error_exc=TalentStatusPeriodLinkDeleteError,
            delete_success_exc=TalentStatusPeriodLinkDeleteSuccess,
        )
