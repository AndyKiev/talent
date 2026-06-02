from typing import Optional, List

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.planning.plan_category_default.plan_category_default_repository import (
    PlanCategoryDefaultRepository,
)
from backend.api_v1.planning.plan_category_default.plan_category_default_schema import (
    PlanCategoryDefault as PlanCategoryDefaultSchema,
    PlanCategoryDefaultCreate,
)
from backend.api_v1.planning.plan_category_default.plan_category_default_errors import (
    PlanCategoryDefaultNotFound,
    PlanCategoryDefaultExists,
    PlanCategoryDefaultDeleteError,
)
from backend.api_v1.planning.plan_category_default.plan_category_default_success import (
    PlanCategoryDefaultCreateSuccess,
    PlanCategoryDefaultDeleteSuccess,
)


class PlanCategoryDefaultService(BaseService):
    def __init__(
        self,
        repository: PlanCategoryDefaultRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int) -> PlanCategoryDefaultSchema:
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(PlanCategoryDefaultNotFound(id))
        return result

    async def get_plan_category_defaults(self) -> List[PlanCategoryDefaultSchema]:
        records = await self.get_all(sort="id")
        return [PlanCategoryDefaultSchema.model_validate(r) for r in records]

    async def create_plan_category_default(
        self, data: PlanCategoryDefaultCreate
    ) -> MutationResponse[PlanCategoryDefaultSchema]:
        existing = await self.repository.get_by_field(
            "department_category_id", data.department_category_id
        )
        if existing:
            raise await self._resolve_domain_error(
                PlanCategoryDefaultExists(data.department_category_id)
            )
        try:
            record = await self.create(data)
            schema = PlanCategoryDefaultSchema.model_validate(record)
            label = (
                schema.department_category.name
                if schema.department_category
                else str(schema.department_category_id)
            )
            detail = await self._resolve_domain_success(
                PlanCategoryDefaultCreateSuccess(label)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                PlanCategoryDefaultExists(data.department_category_id)
            )

    async def delete_plan_category_default(self, default_id: int) -> None:
        record = await self.get_by_id(default_id)
        label = (
            record.department_category.name
            if getattr(record, "department_category", None)
            else str(record.department_category_id)
        )
        await self.delete_by_id(
            default_id,
            name=label,
            delete_error_exc=PlanCategoryDefaultDeleteError,
            delete_success_exc=PlanCategoryDefaultDeleteSuccess,
        )
