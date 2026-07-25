
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.region.region_messages import (
    RegionCreateSuccess,
    RegionDeleteError,
    RegionDeleteSuccess,
    RegionKeyTaken,
    RegionMoveError,
    RegionMoveSuccess,
    RegionNameTaken,
    RegionNotFound,
    RegionNotFoundByName,
    RegionUpdateSuccess,
)
from backend.api_v1.region.region_repository import RegionRepository
from backend.api_v1.region.region_schema import (
    Region as RegionSchema,
)
from backend.api_v1.region.region_schema import (
    RegionCreate,
    RegionUpdate,
)
from backend.utils.enums import MoveDirection

# Gap-10 manual ordering applied to the `sort_order` column.
SORT_FIELD = "sort_order"
SORT_STEP = 10
SORT_START = 10


class RegionService(BaseService):
    def __init__(
        self,
        repository: RegionRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int) -> RegionSchema:
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(RegionNotFound(id))
        return result

    async def get_regions(
        self,
        name: str | None = None,
        is_active: bool | None = None,
        sort: str | None = None,
    ) -> list[RegionSchema]:
        if name:
            record = await self.get_by_name(name, not_found_exc=RegionNotFoundByName)
            return [RegionSchema.model_validate(record)]
        filters = {}
        if is_active is not None:
            filters["is_active"] = is_active
        # Default ordering is by sort_order ascending; a client-supplied
        # sort_json (if any) takes precedence.
        records = await self.get_all(
            params=filters or None,
            sort=None if sort else {SORT_FIELD: "asc"},
            sort_json=sort,
        )
        return [RegionSchema.model_validate(r) for r in records]

    async def create_region(
        self, region_in: RegionCreate
    ) -> MutationResponse[RegionSchema]:
        await self.exists_by_name(region_in.name, already_exists_exc=RegionNameTaken)
        if await self.get_by_field("key", region_in.key):
            raise await self._resolve_domain_error(RegionKeyTaken(region_in.key))
        # Append to the end of the ordered list: max(sort_order) + 10.
        next_order = await self.get_max_sort_value(SORT_FIELD) + SORT_STEP
        try:
            record = await self.create_from_dict(
                {**region_in.model_dump(), SORT_FIELD: next_order}
            )
            schema = RegionSchema.model_validate(record)
            detail = await self._resolve_domain_success(
                RegionCreateSuccess(schema.name)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(RegionNameTaken(region_in.name))

    async def update_region(
        self, region_id: int, region_update: RegionUpdate
    ) -> MutationResponse[RegionSchema]:
        if region_update.name:
            await self.exists_by_name_excluding(
                region_update.name,
                exclude_ids=[region_id],
                already_exists_exc=RegionNameTaken,
            )
        if region_update.key:
            await self.exists_by_field_excluding(
                field_name="key",
                value=region_update.key,
                exclude_ids=[region_id],
                already_exists_exc=RegionKeyTaken,
            )
        try:
            orm_record = await self.get_by_id(region_id)
            updated = await self.update(orm_record, region_update, partial=True)
            schema = RegionSchema.model_validate(updated)
            detail = await self._resolve_domain_success(
                RegionUpdateSuccess(schema.name)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(RegionNameTaken(region_update.name))

    async def move_region(
        self, region_id: int, direction: MoveDirection
    ) -> MutationResponse[RegionSchema]:
        # Ensures the region exists (translated 404 if not).
        await self.get_by_id(region_id)
        # Reorders the whole sequence with gap-10 renumbering; raises a
        # translated RegionMoveError on invalid moves (already top/bottom, etc).
        await self.move_item_with_errors(
            item_id=region_id,
            direction=direction,
            sort_field=SORT_FIELD,
            step=SORT_STEP,
            start_from=SORT_START,
            move_error_exc=RegionMoveError,
        )
        moved = await self.get_by_id(region_id)
        schema = RegionSchema.model_validate(moved)
        detail = await self._resolve_domain_success(RegionMoveSuccess(schema.name))
        return MutationResponse(detail=detail, data=schema)

    async def delete_region(self, region_id: int) -> None:
        record = await self.get_by_id(region_id)
        await self.delete_by_id(
            region_id,
            name=record.name,
            delete_error_exc=RegionDeleteError,
            delete_success_exc=RegionDeleteSuccess,
        )
