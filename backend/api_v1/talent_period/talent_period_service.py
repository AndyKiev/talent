
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.talent_period.talent_period_messages import (
    TalentPeriodCreateSuccess,
    TalentPeriodDeleteError,
    TalentPeriodDeleteSuccess,
    TalentPeriodNameTaken,
    TalentPeriodNotFound,
    TalentPeriodNotFoundByName,
    TalentPeriodUpdateSuccess,
)
from backend.api_v1.talent_period.talent_period_repository import TalentPeriodRepository
from backend.api_v1.talent_period.talent_period_schema import (
    TalentPeriod as TalentPeriodSchema,
)
from backend.api_v1.talent_period.talent_period_schema import (
    TalentPeriodCreate,
    TalentPeriodUpdate,
)


class TalentPeriodService(BaseService):
    def __init__(
        self,
        repository: TalentPeriodRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int):
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(TalentPeriodNotFound(id))
        return result

    async def get_talent_periods(
        self,
        name: str | None = None,
        is_active: bool | None = None,
        sort: str | None = None,
    ) -> list[TalentPeriodSchema]:
        if name:
            record = await self.get_by_name(
                name, not_found_exc=TalentPeriodNotFoundByName
            )
            return [TalentPeriodSchema.model_validate(record)]
        filters = {}
        if is_active is not None:
            filters["is_active"] = is_active
        records = await self.get_all(params=filters or None, sort_json=sort)
        return [TalentPeriodSchema.model_validate(r) for r in records]

    async def create_talent_period(
        self, period_in: TalentPeriodCreate
    ) -> MutationResponse[TalentPeriodSchema]:
        await self.exists_by_name(
            period_in.name, already_exists_exc=TalentPeriodNameTaken
        )
        try:
            record = await self.create(period_in)
            schema = TalentPeriodSchema.model_validate(record)
            detail = await self._resolve_domain_success(
                TalentPeriodCreateSuccess(schema.name)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                TalentPeriodNameTaken(period_in.name)
            )

    async def update_talent_period(
        self, period_id: int, period_update: TalentPeriodUpdate
    ) -> MutationResponse[TalentPeriodSchema]:
        if period_update.name:
            await self.exists_by_name(
                period_update.name, already_exists_exc=TalentPeriodNameTaken
            )
        try:
            orm_record = await self.get_by_id(period_id)
            updated = await self.update(orm_record, period_update, partial=True)
            schema = TalentPeriodSchema.model_validate(updated)
            detail = await self._resolve_domain_success(
                TalentPeriodUpdateSuccess(schema.name)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                TalentPeriodNameTaken(period_update.name or "")
            )

    async def delete_talent_period(self, period_id: int) -> None:
        record = await self.get_by_id(period_id)
        await self.delete_by_id(
            period_id,
            name=record.name,
            delete_error_exc=TalentPeriodDeleteError,
            delete_success_exc=TalentPeriodDeleteSuccess,
        )
