from typing import List, Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.department_type_job_link.department_type_job_link_repository import (
    DepartmentTypeJobLinkRepository,
)
from backend.api_v1.department_type_job_link.department_type_job_link_schema import (
    DepartmentTypeJobLink as DepartmentTypeJobLinkSchema,
    DepartmentTypeJobLinkCreate,
    DepartmentTypeJobLinkUpdate,
    JobWithLinkId,
)
from backend.api_v1.job.job_schema import Job as JobSchema
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.department_type_job_link.department_type_job_link_messages import (
    DepartmentTypeJobLinkNotFound,
    DepartmentTypeJobLinkAlreadyExists,
    DepartmentTypeJobLinkDeleteError,
    DepartmentTypeJobLinkNotFoundByCompositeKey,
)
from backend.api_v1.department_type_job_link.department_type_job_link_messages import (
    DepartmentTypeJobLinkDeleteSuccess,
    DepartmentTypeJobLinkCreateSuccess,
    DepartmentTypeJobLinkUpdateSuccess,
)


def _link_label(link: DepartmentTypeJobLinkSchema) -> str:
    """Human-readable label: '<DepartmentType name> – <Job name>'"""
    dt_name = (
        link.department_type.name
        if link.department_type
        else str(link.department_type_id)
    )
    job_name = link.job.name if link.job else str(link.job_id)
    return f"{dt_name} – {job_name}"


class DepartmentTypeJobLinkService(BaseService):
    def __init__(
        self,
        repository: DepartmentTypeJobLinkRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    async def get_by_id(self, link_id: int) -> DepartmentTypeJobLinkSchema:
        result = await self.repository.get_by_id(link_id)
        if not result:
            raise await self._resolve_domain_error(
                DepartmentTypeJobLinkNotFound(link_id)
            )
        return result

    async def get_links(
        self,
        department_type_id: Optional[int] = None,
        job_id: Optional[int] = None,
        is_active: Optional[bool] = None,
        sort: Optional[str] = None,
    ) -> List[DepartmentTypeJobLinkSchema]:
        filters = {}
        if department_type_id is not None:
            filters["department_type_id"] = department_type_id
        if job_id is not None:
            filters["job_id"] = job_id
        if is_active is not None:
            filters["is_active"] = is_active
        records = await self.get_all(params=filters or None, sort_json=sort)
        return [DepartmentTypeJobLinkSchema.model_validate(r) for r in records]

    async def get_by_composite_key(
        self, department_type_id: int, job_id: int
    ) -> DepartmentTypeJobLinkSchema:
        result = await self.repository.get_by_composite_key(department_type_id, job_id)
        if not result:
            raise await self._resolve_domain_error(
                DepartmentTypeJobLinkNotFoundByCompositeKey(department_type_id, job_id)
            )
        return DepartmentTypeJobLinkSchema.model_validate(result)

    async def get_jobs_by_department_type(
        self,
        department_type_id: int,
        is_active: Optional[bool] = None,  # Changed from True to None
    ) -> List[JobWithLinkId]:
        """
        Return enriched Job objects for a given department type.
        Each record includes link_id and link_is_active for use in delete operations.
        is_active defaults to None (all links regardless of active status).
        Pass is_active=True to get only active links + active jobs.
        Pass is_active=False to get only inactive links.
        """
        rows = await self.repository.get_jobs_by_department_type(
            department_type_id=department_type_id,
            is_active=is_active,
        )
        result = []
        for job_orm, link_id, link_is_active in rows:
            job_data = JobSchema.model_validate(job_orm).model_dump()
            job_data["link_id"] = link_id
            job_data["link_is_active"] = link_is_active
            result.append(JobWithLinkId(**job_data))
        return result

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    async def create_link(
        self, link_in: DepartmentTypeJobLinkCreate
    ) -> MutationResponse[DepartmentTypeJobLinkSchema]:
        # Guard: unique pair
        existing = await self.repository.get_by_composite_key(
            link_in.department_type_id, link_in.job_id
        )
        if existing:
            raise await self._resolve_domain_error(
                DepartmentTypeJobLinkAlreadyExists(
                    link_in.department_type_id, link_in.job_id
                )
            )
        try:
            record = await self.create(link_in)
            schema = DepartmentTypeJobLinkSchema.model_validate(record)
            label = _link_label(schema)
            detail = await self._resolve_domain_success(
                DepartmentTypeJobLinkCreateSuccess(label)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                DepartmentTypeJobLinkAlreadyExists(
                    link_in.department_type_id, link_in.job_id
                )
            )

    async def update_link(
        self, link_id: int, link_update: DepartmentTypeJobLinkUpdate
    ) -> MutationResponse[DepartmentTypeJobLinkSchema]:
        try:
            orm_record = await self.get_by_id(link_id)
            updated = await self.update(orm_record, link_update, partial=True)
            schema = DepartmentTypeJobLinkSchema.model_validate(updated)
            label = _link_label(schema)
            detail = await self._resolve_domain_success(
                DepartmentTypeJobLinkUpdateSuccess(label)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                DepartmentTypeJobLinkAlreadyExists(
                    orm_record.department_type_id, orm_record.job_id
                )
            )

    async def delete_link(self, link_id: int) -> None:
        record = await self.get_by_id(link_id)
        schema = DepartmentTypeJobLinkSchema.model_validate(record)
        label = _link_label(schema)
        await self.delete_by_id(
            link_id,
            name=label,
            delete_error_exc=DepartmentTypeJobLinkDeleteError,
            delete_success_exc=DepartmentTypeJobLinkDeleteSuccess,
        )
