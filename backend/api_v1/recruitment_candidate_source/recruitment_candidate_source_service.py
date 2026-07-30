from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.recruitment_candidate_source.recruitment_candidate_source_messages import (
    RecruitmentCandidateSourceCreateSuccess,
    RecruitmentCandidateSourceDeleteError,
    RecruitmentCandidateSourceDeleteSuccess,
    RecruitmentCandidateSourceKeyTaken,
    RecruitmentCandidateSourceNotFound,
    RecruitmentCandidateSourceUpdateSuccess,
)
from backend.api_v1.recruitment_candidate_source.recruitment_candidate_source_repository import (
    RecruitmentCandidateSourceRepository,
)
from backend.api_v1.recruitment_candidate_source.recruitment_candidate_source_schema import (
    RecruitmentCandidateSource as RecruitmentCandidateSourceSchema,
)
from backend.api_v1.recruitment_candidate_source.recruitment_candidate_source_schema import (
    RecruitmentCandidateSourceCreate,
    RecruitmentCandidateSourceUpdate,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema


class RecruitmentCandidateSourceService(BaseService):
    def __init__(
        self,
        repository: RecruitmentCandidateSourceRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int) -> RecruitmentCandidateSourceSchema:
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(
                RecruitmentCandidateSourceNotFound(id)
            )
        return result

    async def get_candidate_sources(
        self, sort: str | None = None
    ) -> list[RecruitmentCandidateSourceSchema]:
        if sort:
            records = await self.get_all(sort_json=sort)
        else:
            records = await self.get_all(sort=["sort_order", "id"])
        return [RecruitmentCandidateSourceSchema.model_validate(r) for r in records]

    async def create_candidate_source(
        self, source_in: RecruitmentCandidateSourceCreate
    ) -> MutationResponse[RecruitmentCandidateSourceSchema]:
        existing = await self.repository.get_by_field("key", source_in.key)
        if existing:
            raise await self._resolve_domain_error(
                RecruitmentCandidateSourceKeyTaken(source_in.key)
            )
        try:
            record = await self.create(source_in)
            schema = RecruitmentCandidateSourceSchema.model_validate(record)
            detail = await self._resolve_domain_success(
                RecruitmentCandidateSourceCreateSuccess(schema.key)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                RecruitmentCandidateSourceKeyTaken(source_in.key)
            )

    async def update_candidate_source(
        self, candidate_source_id: int, source_update: RecruitmentCandidateSourceUpdate
    ) -> MutationResponse[RecruitmentCandidateSourceSchema]:
        if source_update.key:
            existing = await self.repository.get_by_field("key", source_update.key)
            if existing and existing.id != candidate_source_id:
                raise await self._resolve_domain_error(
                    RecruitmentCandidateSourceKeyTaken(source_update.key)
                )
        try:
            orm_record = await self.get_by_id(candidate_source_id)
            updated = await self.update(orm_record, source_update, partial=True)
            schema = RecruitmentCandidateSourceSchema.model_validate(updated)
            detail = await self._resolve_domain_success(
                RecruitmentCandidateSourceUpdateSuccess(schema.key)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                RecruitmentCandidateSourceKeyTaken(source_update.key)
            )

    async def delete_candidate_source(self, candidate_source_id: int) -> None:
        record = await self.get_by_id(candidate_source_id)
        await self.delete_by_id(
            candidate_source_id,
            name=record.key,
            delete_error_exc=RecruitmentCandidateSourceDeleteError,
            delete_success_exc=RecruitmentCandidateSourceDeleteSuccess,
        )
