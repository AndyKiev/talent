from typing import Optional, List

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.job_responsibility_category_link.job_responsibility_category_link_repository import (
    JobResponsibilityCategoryLinkRepository,
)
from backend.api_v1.job_responsibility_category_link.job_responsibility_category_link_schema import (
    JobResponsibilityCategoryLink as JobResponsibilityCategoryLinkSchema,
    JobResponsibilityCategoryLinkCreate,
    JobResponsibilityCategoryLinkUpdate,
    ResponsibilityCategoryOption,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.job_responsibility_category_link.job_responsibility_category_link_errors import (
    JobResponsibilityCategoryLinkNotFound,
    JobResponsibilityCategoryLinkDuplicate,
    JobResponsibilityCategoryLinkDeleteError,
)
from backend.api_v1.job_responsibility_category_link.job_responsibility_category_link_success import (
    JobResponsibilityCategoryLinkCreateSuccess,
    JobResponsibilityCategoryLinkUpdateSuccess,
    JobResponsibilityCategoryLinkDeleteSuccess,
)
from backend.api_v1.department_category.department_category_repository import (
    DepartmentCategoryRepository,
)


class JobResponsibilityCategoryLinkService(BaseService):
    def __init__(
        self,
        repository: JobResponsibilityCategoryLinkRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)
        self._category_repo = DepartmentCategoryRepository(session=session)

    async def get_by_id(self, link_id: int) -> JobResponsibilityCategoryLinkSchema:
        result = await self.repository.get_by_id(link_id)
        if not result:
            raise await self._resolve_domain_error(
                JobResponsibilityCategoryLinkNotFound(link_id)
            )
        return result

    async def get_links(
        self,
        job_id: Optional[int] = None,
        department_category_id: Optional[int] = None,
        is_active: Optional[bool] = None,
        sort: Optional[str] = None,
    ) -> List[JobResponsibilityCategoryLinkSchema]:
        filters: dict = {}
        if job_id is not None:
            filters["job_id"] = job_id
        if department_category_id is not None:
            filters["department_category_id"] = department_category_id
        if is_active is not None:
            filters["is_active"] = is_active
        records = await self.repository.get_all(filters=filters or None, sort=sort)
        return [JobResponsibilityCategoryLinkSchema.model_validate(r) for r in records]

    async def get_categories_for_job(
        self, job_id: int
    ) -> List[ResponsibilityCategoryOption]:
        """
        Return the department categories valid as responsibility departments
        for this job.

        - If the job has explicit (active) links -> those categories,
          regardless of category.is_main.
        - If the job has NO links -> fall back to categories where is_main=false.
        """
        links = await self.repository.get_all(
            filters={"job_id": job_id, "is_active": True}
        )

        if links:
            options: List[ResponsibilityCategoryOption] = []
            for link in links:
                cat = link.department_category
                if cat:
                    options.append(
                        ResponsibilityCategoryOption(
                            id=cat.id,
                            name=cat.name,
                            is_main=cat.is_main,
                            is_fallback=False,
                        )
                    )
            return options

        # Fallback: categories where is_main = false
        fallback_cats = await self._category_repo.get_all(
            filters={"is_main": False, "is_active": True}
        )
        return [
            ResponsibilityCategoryOption(
                id=c.id, name=c.name, is_main=c.is_main, is_fallback=True
            )
            for c in fallback_cats
        ]

    async def create_link(
        self, link_in: JobResponsibilityCategoryLinkCreate
    ) -> MutationResponse[JobResponsibilityCategoryLinkSchema]:
        # Uniqueness guard
        existing = await self.repository.get_all(
            filters={
                "job_id": link_in.job_id,
                "department_category_id": link_in.department_category_id,
            }
        )
        if existing:
            raise await self._resolve_domain_error(
                JobResponsibilityCategoryLinkDuplicate(
                    link_in.job_id, link_in.department_category_id
                )
            )
        try:
            record = await self.create_from_dict(link_in.model_dump())
            fresh = await self.get_by_id(record.id)
            schema = JobResponsibilityCategoryLinkSchema.model_validate(fresh)
            detail = await self._resolve_domain_success(
                JobResponsibilityCategoryLinkCreateSuccess(schema.id)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                JobResponsibilityCategoryLinkDuplicate(
                    link_in.job_id, link_in.department_category_id
                )
            )

    async def update_link(
        self, link_id: int, link_update: JobResponsibilityCategoryLinkUpdate
    ) -> MutationResponse[JobResponsibilityCategoryLinkSchema]:
        orm_record = await self.get_by_id(link_id)
        updated = await self.update(orm_record, link_update, partial=True)
        schema = JobResponsibilityCategoryLinkSchema.model_validate(updated)
        detail = await self._resolve_domain_success(
            JobResponsibilityCategoryLinkUpdateSuccess(schema.id)
        )
        return MutationResponse(detail=detail, data=schema)

    async def delete_link(self, link_id: int) -> None:
        await self.get_by_id(link_id)
        await self.delete_by_id(
            link_id,
            name=link_id,
            delete_error_exc=JobResponsibilityCategoryLinkDeleteError,
            delete_success_exc=JobResponsibilityCategoryLinkDeleteSuccess,
        )
