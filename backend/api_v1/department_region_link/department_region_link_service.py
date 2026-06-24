from typing import List, Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.department_region_link.department_region_link_repository import (
    DepartmentRegionLinkRepository,
)
from backend.api_v1.department_region_link.department_region_link_schema import (
    DepartmentRegionLink as DepartmentRegionLinkSchema,
    DepartmentRegionLinkCreate,
    DepartmentRegionLinkUpdate,
)
from backend.api_v1.department.department_repository import DepartmentRepository
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.department_region_link.department_region_link_errors import (
    DepartmentRegionLinkNotFound,
    DepartmentRegionLinkNotFoundByDepartment,
    DepartmentRegionLinkAlreadyExists,
    DepartmentRegionLinkDeleteError,
    DepartmentRegionCategoryNotAllowed,
)
from backend.api_v1.department_region_link.department_region_link_success import (
    DepartmentRegionLinkDeleteSuccess,
    DepartmentRegionLinkCreateSuccess,
    DepartmentRegionLinkUpdateSuccess,
)

# Only departments whose category KEY is one of these may be assigned a region.
# NOTE: matched against DepartmentCategory.key (English), case-insensitively,
# because category names are localized (e.g. Ukrainian).
ALLOWED_CATEGORY_KEYS = {"board", "store", "directorate"}


def _link_label(link: DepartmentRegionLinkSchema) -> str:
    region_name = link.region.name if link.region else str(link.region_id)
    return f"dept {link.department_id} – {region_name}"


class DepartmentRegionLinkService(BaseService):
    def __init__(
        self,
        repository: DepartmentRegionLinkRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)
        # Used only to read the department's category for the eligibility guard.
        self.department_repository = DepartmentRepository(session=session)

    # ------------------------------------------------------------------
    # Guards
    # ------------------------------------------------------------------

    async def _assert_department_category_allowed(self, department_id: int) -> None:
        department = await self.department_repository.get_by_id(department_id)
        if not department:
            raise await self._resolve_domain_error(
                DepartmentRegionLinkNotFoundByDepartment(department_id)
            )
        category = department.department_category
        category_key = (category.key if category else "").strip().lower()
        if category_key not in ALLOWED_CATEGORY_KEYS:
            raise await self._resolve_domain_error(
                DepartmentRegionCategoryNotAllowed(
                    category.name if category else "?",
                    ", ".join(sorted(ALLOWED_CATEGORY_KEYS)),
                )
            )

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    async def get_by_id(self, link_id: int) -> DepartmentRegionLinkSchema:
        result = await self.repository.get_by_id(link_id)
        if not result:
            raise await self._resolve_domain_error(
                DepartmentRegionLinkNotFound(link_id)
            )
        return result

    async def get_links(
        self,
        department_id: Optional[int] = None,
        region_id: Optional[int] = None,
        is_active: Optional[bool] = None,
        sort: Optional[str] = None,
    ) -> List[DepartmentRegionLinkSchema]:
        filters = {}
        if department_id is not None:
            filters["department_id"] = department_id
        if region_id is not None:
            filters["region_id"] = region_id
        if is_active is not None:
            filters["is_active"] = is_active
        records = await self.get_all(params=filters or None, sort_json=sort)
        return [DepartmentRegionLinkSchema.model_validate(r) for r in records]

    async def get_by_department(self, department_id: int) -> DepartmentRegionLinkSchema:
        result = await self.repository.get_by_department_id(department_id)
        if not result:
            raise await self._resolve_domain_error(
                DepartmentRegionLinkNotFoundByDepartment(department_id)
            )
        return DepartmentRegionLinkSchema.model_validate(result)

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    async def create_link(
        self, link_in: DepartmentRegionLinkCreate
    ) -> MutationResponse[DepartmentRegionLinkSchema]:
        # Guard 1: department category must be eligible.
        await self._assert_department_category_allowed(link_in.department_id)
        # Guard 2: one-to-one — department must not already have a region.
        existing = await self.repository.get_by_department_id(link_in.department_id)
        if existing:
            raise await self._resolve_domain_error(
                DepartmentRegionLinkAlreadyExists(link_in.department_id)
            )
        try:
            record = await self.create(link_in)
            schema = DepartmentRegionLinkSchema.model_validate(record)
            label = _link_label(schema)
            detail = await self._resolve_domain_success(
                DepartmentRegionLinkCreateSuccess(label)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                DepartmentRegionLinkAlreadyExists(link_in.department_id)
            )

    async def update_link(
        self, link_id: int, link_update: DepartmentRegionLinkUpdate
    ) -> MutationResponse[DepartmentRegionLinkSchema]:
        orm_record = await self.get_by_id(link_id)
        updated = await self.update(orm_record, link_update, partial=True)
        schema = DepartmentRegionLinkSchema.model_validate(updated)
        label = _link_label(schema)
        detail = await self._resolve_domain_success(
            DepartmentRegionLinkUpdateSuccess(label)
        )
        return MutationResponse(detail=detail, data=schema)

    async def delete_link(self, link_id: int) -> None:
        record = await self.get_by_id(link_id)
        schema = DepartmentRegionLinkSchema.model_validate(record)
        label = _link_label(schema)
        await self.delete_by_id(
            link_id,
            name=label,
            delete_error_exc=DepartmentRegionLinkDeleteError,
            delete_success_exc=DepartmentRegionLinkDeleteSuccess,
        )
