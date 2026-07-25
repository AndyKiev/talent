# backend/api_v1/essence/essence_service.py

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.essence.essence_messages import (
    EssenceCreateSuccess,
    EssenceDeleteError,
    EssenceDeleteSuccess,
    EssenceNameTaken,
    EssenceNotFound,
    EssenceUpdateSuccess,
)
from backend.api_v1.essence.essence_repository import EssenceRepository
from backend.api_v1.essence.essence_schema import (
    EssenceCreate,
    EssenceSchema,
    EssenceUpdate,
)


class EssenceService(BaseService):

    def __init__(
        self,
        repository: EssenceRepository,
        user: UserSchema | None = None,
        session: AsyncSession | None = None,
    ) -> None:
        super().__init__(repository, session=session)

    # ── Read ──────────────────────────────────────────────────────────────────

    async def get_all(self, name: str | None = None) -> list[EssenceSchema]:
        records = await self.repository.get_all(name=name)
        return [EssenceSchema.model_validate(r) for r in records]

    async def get_by_id(self, essence_id: int) -> EssenceSchema:
        record = await self.repository.get_by_id(essence_id)
        if not record:
            raise await self._resolve_domain_error(EssenceNotFound(essence_id))
        return EssenceSchema.model_validate(record)

    async def get_by_name(self, name: str) -> EssenceSchema:
        record = await self.repository.get_by_name(name)
        if not record:
            raise await self._resolve_domain_error(EssenceNotFound(name))
        return EssenceSchema.model_validate(record)

    # ── Write ─────────────────────────────────────────────────────────────────

    async def create(self, data: EssenceCreate) -> MutationResponse[EssenceSchema]:
        existing = await self.repository.get_by_name(data.name)
        if existing:
            raise await self._resolve_domain_error(EssenceNameTaken(data.name))
        record = await self.repository.create(data)
        await self.session.commit()
        schema = EssenceSchema.model_validate(record)
        detail = await self._resolve_domain_success(EssenceCreateSuccess(record.name))
        return MutationResponse(detail=detail, data=schema)

    async def update(
        self, essence_id: int, data: EssenceUpdate
    ) -> MutationResponse[EssenceSchema]:
        record = await self.repository.get_by_id(essence_id)
        if not record:
            raise await self._resolve_domain_error(EssenceNotFound(essence_id))

        if data.name and data.name != record.name:
            conflict = await self.repository.get_by_name(data.name)
            if conflict:
                raise await self._resolve_domain_error(EssenceNameTaken(data.name))

        updated = await self.repository.update(record, data)
        await self.session.commit()
        schema = EssenceSchema.model_validate(updated)
        detail = await self._resolve_domain_success(EssenceUpdateSuccess(updated.name))
        return MutationResponse(detail=detail, data=schema)

    async def delete(self, essence_id: int) -> None:
        record = await self.repository.get_by_id(essence_id)
        if not record:
            raise await self._resolve_domain_error(EssenceNotFound(essence_id))
        if record.operation_links:
            raise await self._resolve_domain_error(EssenceDeleteError(record.name))
        await self.delete_by_id(
            essence_id,
            name=record.name,
            delete_error_exc=EssenceDeleteError,
            delete_success_exc=EssenceDeleteSuccess,
        )
