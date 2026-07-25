
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.planning.plan_scope_default.plan_scope_default_messages import (
    PlanScopeDefaultCreateSuccess,
    PlanScopeDefaultDeleteError,
    PlanScopeDefaultDeleteSuccess,
    PlanScopeDefaultExists,
    PlanScopeDefaultNotFound,
)
from backend.api_v1.planning.plan_scope_default.plan_scope_default_repository import (
    PlanScopeDefaultRepository,
)
from backend.api_v1.planning.plan_scope_default.plan_scope_default_schema import (
    PlanScopeDefault as PlanScopeDefaultSchema,
)
from backend.api_v1.planning.plan_scope_default.plan_scope_default_schema import (
    PlanScopeDefaultCreate,
)


def _scope_label(schema: PlanScopeDefaultSchema) -> str:
    jg = schema.job_group.name if schema.job_group else str(schema.job_group_id)
    if schema.talent_status:
        return f"{jg} / {schema.talent_status.key}"
    return f"{jg} / all"


class PlanScopeDefaultService(BaseService):
    def __init__(
        self,
        repository: PlanScopeDefaultRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int) -> PlanScopeDefaultSchema:
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(PlanScopeDefaultNotFound(id))
        return result

    async def get_plan_scope_defaults(self) -> list[PlanScopeDefaultSchema]:
        records = await self.get_all(sort="id")
        return [PlanScopeDefaultSchema.model_validate(r) for r in records]

    async def create_plan_scope_default(
        self, data: PlanScopeDefaultCreate
    ) -> MutationResponse[PlanScopeDefaultSchema]:
        # Composite uniqueness (job_group_id + talent_status_id, NULL allowed)
        existing = await self.repository.get_all(
            filters={
                "job_group_id": data.job_group_id,
                "talent_status_id": data.talent_status_id,
            }
        )
        if existing:
            raise await self._resolve_domain_error(
                PlanScopeDefaultExists(f"{data.job_group_id}/{data.talent_status_id}")
            )
        try:
            record = await self.create(data)
            schema = PlanScopeDefaultSchema.model_validate(record)
            detail = await self._resolve_domain_success(
                PlanScopeDefaultCreateSuccess(_scope_label(schema))
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                PlanScopeDefaultExists(f"{data.job_group_id}/{data.talent_status_id}")
            )

    async def delete_plan_scope_default(self, default_id: int) -> None:
        record = await self.get_by_id(default_id)
        schema = PlanScopeDefaultSchema.model_validate(record)
        await self.delete_by_id(
            default_id,
            name=_scope_label(schema),
            delete_error_exc=PlanScopeDefaultDeleteError,
            delete_success_exc=PlanScopeDefaultDeleteSuccess,
        )
