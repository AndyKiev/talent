from typing import List, Optional
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.operation.operation_repository import OperationRepository
from backend.api_v1.operation.operation_schema import (
    Operation as OperationSchema,
    OperationCreate,
    OperationUpdate,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.operation.operation_errors import (
    OperationNotFound,
    OperationNotFoundByName,
    OperationNameTaken,
    OperationHasGroups,
    OperationDeleteError,
)
from backend.api_v1.operation.operation_success import (
    OperationDeleteSuccess,
    OperationCreateSuccess,
    OperationUpdateSuccess,
)
from backend.api_v1.base.errors import DomainError
from backend.api_v1.operation.operation_model import Operation  # Import ORM model


class OperationService(BaseService):
    def __init__(
            self,
            repository: OperationRepository,
            user: Optional[UserSchema] = None,
            session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    # Fixed return type: returns ORM model, not Pydantic schema
    async def get_by_id(self, id: int) -> Operation:
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(OperationNotFound(id))
        return result

    async def get_operations(
            self,
            name: Optional[str] = None,
    ) -> List[OperationSchema]:
        if name:
            operation = await self.get_by_name(
                name, not_found_exc=OperationNotFoundByName
            )
            return [OperationSchema.model_validate(operation)]
        operations = await self.get_all()
        return [OperationSchema.model_validate(op) for op in operations]

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    async def create_operation(
            self, operation_in: OperationCreate
    ) -> MutationResponse[OperationSchema]:
        await self.exists_by_name(
            operation_in.name, already_exists_exc=OperationNameTaken
        )
        try:
            operation = await self.create(operation_in)
            schema = OperationSchema.model_validate(operation)
            detail = await self._resolve_domain_success(
                OperationCreateSuccess(schema.name)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                OperationNameTaken(operation_in.name)
            )

    async def update_operation(
            self, operation_id: int, operation_update: OperationUpdate
    ) -> MutationResponse[OperationSchema]:
        if operation_update.name:
            await self.exists_by_name(
                operation_update.name, already_exists_exc=OperationNameTaken
            )
        try:
            orm_operation = await self.get_by_id(operation_id)

            # Type checker fix: ModelType is a module-level TypeVar.
            # Explicit ignore is the standard, safe way to satisfy static analysis here.
            updated = await self.update(orm_operation, operation_update, partial=True)  # type: ignore[arg-type]

            schema = OperationSchema.model_validate(updated)
            detail = await self._resolve_domain_success(
                OperationUpdateSuccess(schema.name)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                OperationNameTaken(operation_update.name)
            )

    async def delete_operation(self, operation_id: int) -> None:
        operation = await self.get_by_id(operation_id)
        if operation.user_groups:
            raise await self._resolve_domain_error(
                OperationHasGroups(operation.name, operation.user_groups)
            )
        await self.delete_by_id(
            operation_id,
            name=operation.name,
            delete_error_exc=OperationDeleteError,
            delete_success_exc=OperationDeleteSuccess,
        )

    # ------------------------------------------------------------------
    # Group management
    # ------------------------------------------------------------------

    async def add_to_group(
            self, operation_id: int, user_group_id: int
    ) -> OperationSchema:
        try:
            operation = await self.repository.add_operation_to_user_group(
                operation_id, user_group_id
            )
            return OperationSchema.model_validate(operation)
        except DomainError as exc:
            raise await self._resolve_domain_error(exc)

    async def remove_from_group(
            self, operation_id: int, user_group_id: int
    ) -> OperationSchema:
        try:
            operation = await self.repository.remove_operation_from_user_group(
                operation_id, user_group_id
            )
            return OperationSchema.model_validate(operation)
        except DomainError as exc:
            raise await self._resolve_domain_error(exc)

    async def set_groups(
            self, operation_id: int, user_group_ids: List[int]
    ) -> OperationSchema:
        try:
            operation = await self.repository.set_operation_user_groups(
                operation_id, user_group_ids
            )
            return OperationSchema.model_validate(operation)
        except DomainError as exc:
            raise await self._resolve_domain_error(exc)