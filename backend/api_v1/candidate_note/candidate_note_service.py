from typing import Optional, List

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.candidate_note.candidate_note_repository import (
    CandidateNoteRepository,
)
from backend.api_v1.candidate_note.candidate_note_model import CandidateNote
from backend.api_v1.candidate_note.candidate_note_schema import (
    CandidateNoteSchema,
    CandidateNoteCreate,
    CandidateNoteAuthorMini,
)
from backend.api_v1.employee.employee_minis import fetch_employee_minis
from backend.api_v1.candidate_note.candidate_note_messages import (
    CandidateNoteNotFound,
    CandidateNoteCreateSuccess,
)


class CandidateNoteService(BaseService):
    def __init__(
        self,
        repository: CandidateNoteRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int) -> CandidateNote:
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(CandidateNoteNotFound(id))
        return result

    async def _enrich_many(
        self, schemas: List[CandidateNoteSchema]
    ) -> List[CandidateNoteSchema]:
        """Fill the author minis via a column query (author is lazy="noload")."""
        emp_minis = await fetch_employee_minis(
            self.repository.session, (s.author_id for s in schemas)
        )
        for s in schemas:
            mini = emp_minis.get(s.author_id)
            if mini:
                s.author = CandidateNoteAuthorMini(**mini)
        return schemas

    async def get_candidate_notes(
        self, candidate_id: Optional[int] = None
    ) -> List[CandidateNoteSchema]:
        filters = {}
        if candidate_id is not None:
            filters["candidate_id"] = candidate_id
        records = await self.get_all(params=filters or None, sort=["created_at", "id"])
        return await self._enrich_many(
            [CandidateNoteSchema.model_validate(r) for r in records]
        )

    async def create_candidate_note(
        self, note_in: CandidateNoteCreate
    ) -> MutationResponse[CandidateNoteSchema]:
        record = CandidateNote(
            candidate_id=note_in.candidate_id,
            body=note_in.body,
            author_id=self.user.id,
        )
        record = await self.repository.create(instance=record)
        record = await self.get_by_id(record.id)
        schemas = await self._enrich_many([CandidateNoteSchema.model_validate(record)])
        detail = await self._resolve_domain_success(CandidateNoteCreateSuccess())
        return MutationResponse(detail=detail, data=schemas[0])
