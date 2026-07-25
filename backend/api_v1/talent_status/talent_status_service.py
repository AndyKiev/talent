
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.talent_status.talent_status_messages import (
    TalentStatusCreateSuccess,
    TalentStatusDeleteError,
    TalentStatusDeleteSuccess,
    TalentStatusKeyTaken,
    TalentStatusNotFound,
    TalentStatusNotFoundByName,
    TalentStatusUpdateSuccess,
)
from backend.api_v1.talent_status.talent_status_repository import TalentStatusRepository
from backend.api_v1.talent_status.talent_status_schema import (
    TalentStatus as TalentStatusSchema,
)
from backend.api_v1.talent_status.talent_status_schema import (
    TalentStatusCreate,
    TalentStatusUpdate,
)


class TalentStatusService(BaseService):
    def __init__(
        self,
        repository: TalentStatusRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int):
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(TalentStatusNotFound(id))
        return result

    async def get_talent_statuses(
        self,
        name: str | None = None,
        is_active: bool | None = None,
        sort: str | None = None,
    ) -> list[TalentStatusSchema]:
        if name:
            record = await self.get_by_name(
                name, not_found_exc=TalentStatusNotFoundByName
            )
            return [TalentStatusSchema.model_validate(record)]
        filters = {}
        if is_active is not None:
            filters["is_active"] = is_active
        records = await self.get_all(params=filters or None, sort_json=sort)
        return [TalentStatusSchema.model_validate(r) for r in records]

    async def create_talent_status(
        self, status_in: TalentStatusCreate
    ) -> MutationResponse[TalentStatusSchema]:
        # Guard unique key
        existing_key = await self.repository.get_by_field(
            "key", status_in.key, case_insensitive=True
        )
        if existing_key:
            raise await self._resolve_domain_error(TalentStatusKeyTaken(status_in.key))
        try:
            record = await self.create(status_in)
            schema = TalentStatusSchema.model_validate(record)
            detail = await self._resolve_domain_success(
                TalentStatusCreateSuccess(schema.name)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(TalentStatusKeyTaken(status_in.key))

    async def update_talent_status(
        self, status_id: int, status_update: TalentStatusUpdate
    ) -> MutationResponse[TalentStatusSchema]:
        if status_update.key:
            existing_key = await self.repository.get_by_field_excluding(
                "key", status_update.key, exclude_ids=[status_id], case_insensitive=True
            )
            if existing_key:
                raise await self._resolve_domain_error(
                    TalentStatusKeyTaken(status_update.key)
                )
        try:
            orm_record = await self.get_by_id(status_id)
            updated = await self.update(orm_record, status_update, partial=True)
            schema = TalentStatusSchema.model_validate(updated)
            detail = await self._resolve_domain_success(
                TalentStatusUpdateSuccess(schema.name)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                TalentStatusKeyTaken(status_update.key or "")
            )

    async def delete_talent_status(self, status_id: int) -> None:
        record = await self.get_by_id(status_id)
        await self.delete_by_id(
            status_id,
            name=record.name,
            delete_error_exc=TalentStatusDeleteError,
            delete_success_exc=TalentStatusDeleteSuccess,
        )
