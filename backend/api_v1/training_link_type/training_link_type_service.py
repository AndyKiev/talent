
from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.training_link_type.training_link_type_messages import (
    TrainingLinkTypeCreateSuccess,
    TrainingLinkTypeDeleteError,
    TrainingLinkTypeDeleteSuccess,
    TrainingLinkTypeKeyTaken,
    TrainingLinkTypeNotFound,
    TrainingLinkTypeUpdateSuccess,
)
from backend.api_v1.training_link_type.training_link_type_repository import (
    TrainingLinkTypeRepository,
)
from backend.api_v1.training_link_type.training_link_type_schema import (
    TrainingLinkType as TrainingLinkTypeSchema,
)
from backend.api_v1.training_link_type.training_link_type_schema import (
    TrainingLinkTypeCreate,
    TrainingLinkTypeUpdate,
)
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession


class TrainingLinkTypeService(BaseService):
    def __init__(
        self,
        repository: TrainingLinkTypeRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int) -> TrainingLinkTypeSchema:
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(TrainingLinkTypeNotFound(id))
        return result

    async def get_training_link_types(self) -> list[TrainingLinkTypeSchema]:
        records = await self.get_all(sort=["id"])
        return [TrainingLinkTypeSchema.model_validate(r) for r in records]

    async def get_id_by_key(self, key: str) -> int | None:
        return await self.repository.get_id_by_field("key", key)

    async def create_training_link_type(
        self, data: TrainingLinkTypeCreate
    ) -> MutationResponse[TrainingLinkTypeSchema]:
        existing = await self.repository.get_by_field("key", data.key)
        if existing:
            raise await self._resolve_domain_error(TrainingLinkTypeKeyTaken(data.key))
        try:
            record = await self.create(data)
            schema = TrainingLinkTypeSchema.model_validate(record)
            detail = await self._resolve_domain_success(
                TrainingLinkTypeCreateSuccess(schema.key)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(TrainingLinkTypeKeyTaken(data.key))

    async def update_training_link_type(
        self, record_id: int, data: TrainingLinkTypeUpdate
    ) -> MutationResponse[TrainingLinkTypeSchema]:
        if data.key:
            existing = await self.repository.get_by_field("key", data.key)
            if existing and existing.id != record_id:
                raise await self._resolve_domain_error(
                    TrainingLinkTypeKeyTaken(data.key)
                )
        try:
            orm_record = await self.get_by_id(record_id)
            updated = await self.update(orm_record, data, partial=True)
            schema = TrainingLinkTypeSchema.model_validate(updated)
            detail = await self._resolve_domain_success(
                TrainingLinkTypeUpdateSuccess(schema.key)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(TrainingLinkTypeKeyTaken(data.key))

    async def delete_training_link_type(self, record_id: int) -> None:
        record = await self.get_by_id(record_id)
        await self.delete_by_id(
            record_id,
            name=record.key,
            delete_error_exc=TrainingLinkTypeDeleteError,
            delete_success_exc=TrainingLinkTypeDeleteSuccess,
        )
