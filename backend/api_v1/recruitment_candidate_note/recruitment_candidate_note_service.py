from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.recruitment_candidate_note.recruitment_candidate_note_messages import (
    RecruitmentCandidateNoteCreateSuccess,
    RecruitmentCandidateNoteNotFound,
)
from backend.api_v1.recruitment_candidate_note.recruitment_candidate_note_model import (
    RecruitmentCandidateNote,
)
from backend.api_v1.recruitment_candidate_note.recruitment_candidate_note_repository import (
    RecruitmentCandidateNoteRepository,
)
from backend.api_v1.recruitment_candidate_note.recruitment_candidate_note_schema import (
    RecruitmentCandidateNoteAuthorMini,
    RecruitmentCandidateNoteCreate,
    RecruitmentCandidateNoteSchema,
)
from backend.api_v1.employee.employee_minis import fetch_employee_minis
from backend.api_v1.employee.employee_schema import EmployeeSchema


class RecruitmentCandidateNoteService(BaseService):
    def __init__(
        self,
        repository: RecruitmentCandidateNoteRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int) -> RecruitmentCandidateNote:
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(RecruitmentCandidateNoteNotFound(id))
        return result

    async def _enrich_many(
        self, schemas: list[RecruitmentCandidateNoteSchema]
    ) -> list[RecruitmentCandidateNoteSchema]:
        """Fill the creator minis via a column query (creator is lazy="noload")."""
        emp_minis = await fetch_employee_minis(
            self.repository.session, (s.created_by for s in schemas)
        )
        for s in schemas:
            mini = emp_minis.get(s.created_by)
            if mini:
                s.creator = RecruitmentCandidateNoteAuthorMini(**mini)
        return schemas

    async def get_candidate_notes(
        self, candidate_id: int | None = None
    ) -> list[RecruitmentCandidateNoteSchema]:
        filters = {}
        if candidate_id is not None:
            filters["candidate_id"] = candidate_id
        records = await self.get_all(params=filters or None, sort=["created_at", "id"])
        return await self._enrich_many(
            [RecruitmentCandidateNoteSchema.model_validate(r) for r in records]
        )

    async def create_candidate_note(
        self, note_in: RecruitmentCandidateNoteCreate
    ) -> MutationResponse[RecruitmentCandidateNoteSchema]:
        record = RecruitmentCandidateNote(
            candidate_id=note_in.candidate_id,
            body=note_in.body,
            created_by=self.user.id,
        )
        record = await self.repository.create(instance=record)
        record = await self.get_by_id(record.id)
        schemas = await self._enrich_many(
            [RecruitmentCandidateNoteSchema.model_validate(record)]
        )
        detail = await self._resolve_domain_success(
            RecruitmentCandidateNoteCreateSuccess()
        )
        return MutationResponse(detail=detail, data=schemas[0])
