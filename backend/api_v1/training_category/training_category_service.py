from typing import Optional, List

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.training_category.training_category_repository import (
    TrainingCategoryRepository,
)
from backend.api_v1.training_category.training_category_schema import (
    TrainingCategory as TrainingCategorySchema,
    TrainingCategoryCreate,
    TrainingCategoryUpdate,
)
from backend.api_v1.training_category.training_category_errors import (
    TrainingCategoryNotFound,
    TrainingCategoryNameTaken,
    TrainingCategoryKeyTaken,
    TrainingCategoryDeleteError,
)
from backend.api_v1.training_category.training_category_success import (
    TrainingCategoryCreateSuccess,
    TrainingCategoryUpdateSuccess,
    TrainingCategoryDeleteSuccess,
)


class TrainingCategoryService(BaseService):
    def __init__(
        self,
        repository: TrainingCategoryRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int) -> TrainingCategorySchema:
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(TrainingCategoryNotFound(id))
        return result

    async def get_training_categories(self) -> List[TrainingCategorySchema]:
        records = await self.get_all(sort=["name"])
        return [TrainingCategorySchema.model_validate(r) for r in records]

    async def _check_unique(
        self, name: Optional[str], key: Optional[str], exclude_id: Optional[int] = None
    ) -> None:
        if name:
            existing = await self.repository.get_by_field("name", name)
            if existing and existing.id != exclude_id:
                raise await self._resolve_domain_error(TrainingCategoryNameTaken(name))
        if key:
            existing = await self.repository.get_by_field("key", key)
            if existing and existing.id != exclude_id:
                raise await self._resolve_domain_error(TrainingCategoryKeyTaken(key))

    async def create_training_category(
        self, data: TrainingCategoryCreate
    ) -> MutationResponse[TrainingCategorySchema]:
        await self._check_unique(data.name, data.key)
        try:
            record = await self.create(data)
            schema = TrainingCategorySchema.model_validate(record)
            detail = await self._resolve_domain_success(
                TrainingCategoryCreateSuccess(schema.name)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(TrainingCategoryKeyTaken(data.key))

    async def update_training_category(
        self, record_id: int, data: TrainingCategoryUpdate
    ) -> MutationResponse[TrainingCategorySchema]:
        await self._check_unique(data.name, data.key, exclude_id=record_id)
        try:
            orm_record = await self.get_by_id(record_id)
            updated = await self.update(orm_record, data, partial=True)
            schema = TrainingCategorySchema.model_validate(updated)
            detail = await self._resolve_domain_success(
                TrainingCategoryUpdateSuccess(schema.name)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(TrainingCategoryKeyTaken(data.key))

    async def delete_training_category(self, record_id: int) -> None:
        record = await self.get_by_id(record_id)
        await self.delete_by_id(
            record_id,
            name=record.name,
            delete_error_exc=TrainingCategoryDeleteError,
            delete_success_exc=TrainingCategoryDeleteSuccess,
        )
