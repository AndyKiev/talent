
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.education_degree.education_degree_repository import (
    EducationDegreeRepository,
)
from backend.api_v1.education_degree.education_degree_schema import (
    EducationDegree as EducationDegreeSchema,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema


class EducationDegreeService(BaseService):
    def __init__(
        self,
        repository: EducationDegreeRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_degrees(
        self, is_active: bool | None = None
    ) -> list[EducationDegreeSchema]:
        filters = {}
        if is_active is not None:
            filters["is_active"] = is_active
        records = await self.get_all(
            params=filters or None, sort_json='{"sort_order": "asc"}'
        )
        return [EducationDegreeSchema.model_validate(r) for r in records]
