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
)
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

    async def get_candidate_notes(
        self, candidate_id: Optional[int] = None
    ) -> List[CandidateNoteSchema]:
        filters = {}
        if candidate_id is not None:
            filters["candidate_id"] = candidate_id
        records = await self.get_all(params=filters or None, sort=["created_at", "id"])
        return [CandidateNoteSchema.model_validate(r) for r in records]

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
        schema = CandidateNoteSchema.model_validate(record)
        detail = await self._resolve_domain_success(CandidateNoteCreateSuccess())
        return MutationResponse(detail=detail, data=schema)
