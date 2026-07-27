
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.user_group.user_group_minis import fetch_group_names_by_type
from backend.api_v1.user_group_type.user_group_type_messages import (
    UserGroupTypeCreateSuccess,
    UserGroupTypeDeleteError,
    UserGroupTypeDeleteSuccess,
    UserGroupTypeNameTaken,
    UserGroupTypeNotFound,
    UserGroupTypeNotFoundByName,
    UserGroupTypeUpdateSuccess,
)
from backend.api_v1.user_group_type.user_group_type_repository import (
    UserGroupTypeRepository,
)
from backend.api_v1.user_group_type.user_group_type_schema import (
    UserGroupType as UserGroupTypeSchema,
)
from backend.api_v1.user_group_type.user_group_type_schema import (
    UserGroupTypeCreate,
    UserGroupTypeUpdate,
)


class UserGroupTypeService(BaseService):
    def __init__(
        self,
        repository: UserGroupTypeRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, user=user, session=session)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _to_schemas(self, records) -> list[UserGroupTypeSchema]:
        """Convert ORM UserGroupType rows → schemas, filling `groups`.

        UserGroupType.user_groups is lazy="noload" (it sits on the access-grant
        cycle — see the model), so the group NAMES the schema exposes come from
        one lightweight column query instead of the eager relationship.
        Uses the REPOSITORY's session, which is always present.
        """
        schemas = [UserGroupTypeSchema.model_validate(r) for r in records]
        names_by_type = await fetch_group_names_by_type(
            self.repository.session, (s.id for s in schemas)
        )
        for schema in schemas:
            schema.groups = names_by_type.get(schema.id, [])
        return schemas

    async def _to_schema(self, record) -> UserGroupTypeSchema:
        return (await self._to_schemas([record]))[0]

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    async def get_by_id(self, id: int) -> UserGroupTypeSchema:
        """NOTE: returns the ORM row, not a schema (the annotation is legacy).
        Write paths need the ORM instance. For a response payload use
        get_user_group_type_schema, which fills `groups`."""
        result = await self.repository.get_by_id(id)
        if not result:
            exc = UserGroupTypeNotFound(id)
            raise await self._resolve_domain_error(exc)
        return result

    async def get_user_group_type_schema(self, id: int) -> UserGroupTypeSchema:
        """Single type as a fully-populated response schema."""
        return await self._to_schema(await self.get_by_id(id))

    async def get_user_group_types(
        self,
        name: str | None = None,
        sort: str | None = None,
    ) -> list[UserGroupTypeSchema]:
        if name:
            record = await self.get_by_name(
                name, not_found_exc=UserGroupTypeNotFoundByName
            )
            return await self._to_schemas([record])
        records = await self.get_all(sort_json=sort)
        return await self._to_schemas(records)

    async def create_user_group_type(
        self, type_in: UserGroupTypeCreate
    ) -> MutationResponse[UserGroupTypeSchema]:
        await self.exists_by_name(
            type_in.name, already_exists_exc=UserGroupTypeNameTaken
        )
        try:
            record = await self.create(type_in)
            schema = await self._to_schema(record)
            detail = await self._resolve_domain_success(
                UserGroupTypeCreateSuccess(schema.name)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(UserGroupTypeNameTaken(type_in.name))

    async def update_user_group_type(
        self, type_id: int, type_update: UserGroupTypeUpdate
    ) -> MutationResponse[UserGroupTypeSchema]:
        if type_update.name:
            await self.exists_by_name(
                type_update.name, already_exists_exc=UserGroupTypeNameTaken
            )
        try:
            orm_record = await self.get_by_id(type_id)
            updated = await self.update(orm_record, type_update, partial=True)
            schema = await self._to_schema(updated)
            detail = await self._resolve_domain_success(
                UserGroupTypeUpdateSuccess(schema.name)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                UserGroupTypeNameTaken(type_update.name)
            )

    async def delete_user_group_type(self, type_id: int) -> None:
        record = await self.get_by_id(type_id)
        await self.delete_by_id(
            type_id,
            name=record.name,
            delete_error_exc=UserGroupTypeDeleteError,
            delete_success_exc=UserGroupTypeDeleteSuccess,
        )
