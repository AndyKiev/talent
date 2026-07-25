
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.candidate.candidate_messages import (
    CandidateCreateSuccess,
    CandidateDeleteError,
    CandidateDeleteSuccess,
    CandidateEmailTaken,
    CandidateNotFound,
    CandidateUpdateSuccess,
)
from backend.api_v1.candidate.candidate_model import Candidate
from backend.api_v1.candidate.candidate_repository import CandidateRepository
from backend.api_v1.candidate.candidate_schema import (
    CandidateCreate,
    CandidateSchema,
    CandidateUpdate,
)
from backend.api_v1.candidate_phone.candidate_phone_model import CandidatePhone
from backend.api_v1.employee.employee_schema import EmployeeSchema


class CandidateService(BaseService):
    def __init__(
        self,
        repository: CandidateRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int) -> Candidate:
        result = await self.repository.get_by_id(id)
        if not result:
            raise await self._resolve_domain_error(CandidateNotFound(id))
        return result

    def _to_schema(self, orm: Candidate) -> CandidateSchema:
        """Read schema with the derived application_count / furthest_stage."""
        schema = CandidateSchema.model_validate(orm)
        apps = orm.applications or []
        schema.application_count = len(apps)
        if apps:
            furthest = max(
                apps, key=lambda a: (a.status.sort_order if a.status else -1)
            )
            if furthest.status:
                schema.furthest_stage = furthest.status.name
                schema.furthest_stage_sort = furthest.status.sort_order
        return schema

    @staticmethod
    def _display_name(orm: Candidate) -> str:
        return f"{orm.first_name} {orm.last_name}".strip()

    async def _check_email_free(
        self, email: str | None, exclude_id: int | None = None
    ) -> None:
        if not email:
            return
        existing = await self.repository.get_by_field("email", email)
        if existing and existing.id != exclude_id:
            raise await self._resolve_domain_error(CandidateEmailTaken(email))

    async def get_candidates(
        self, sort: str | None = None
    ) -> list[CandidateSchema]:
        records = await self.get_all(
            sort_json=sort,
            sort=None if sort else [{"created_at": "desc"}, {"id": "desc"}],
        )
        return [self._to_schema(r) for r in records]

    async def create_candidate(
        self, candidate_in: CandidateCreate
    ) -> MutationResponse[CandidateSchema]:
        await self._check_email_free(candidate_in.email)
        data = candidate_in.model_dump(exclude={"phones"})
        record = Candidate(**data, created_by=self.user.id)
        record.phones = [
            CandidatePhone(phone=p.strip(), sort_order=i)
            for i, p in enumerate(candidate_in.phones)
            if p and p.strip()
        ]
        try:
            record = await self.repository.create(instance=record)
        except IntegrityError:
            raise await self._resolve_domain_error(
                CandidateEmailTaken(candidate_in.email or "")
            )
        record = await self.get_by_id(record.id)
        schema = self._to_schema(record)
        detail = await self._resolve_domain_success(
            CandidateCreateSuccess(self._display_name(record))
        )
        return MutationResponse(detail=detail, data=schema)

    async def update_candidate(
        self, candidate_id: int, candidate_update: CandidateUpdate
    ) -> MutationResponse[CandidateSchema]:
        orm_record = await self.get_by_id(candidate_id)
        if candidate_update.email is not None:
            await self._check_email_free(candidate_update.email, exclude_id=candidate_id)
        for key, value in candidate_update.model_dump(
            exclude={"phones"}, exclude_unset=True
        ).items():
            setattr(orm_record, key, value)
        # None = leave phones as-is; a list (incl. empty) replaces the set.
        if candidate_update.phones is not None:
            orm_record.phones.clear()  # delete-orphan removes the old rows
            for i, p in enumerate(candidate_update.phones):
                if p and p.strip():
                    orm_record.phones.append(
                        CandidatePhone(phone=p.strip(), sort_order=i)
                    )
        try:
            await self.session.commit()
        except IntegrityError:
            await self.session.rollback()
            raise await self._resolve_domain_error(
                CandidateEmailTaken(candidate_update.email or "")
            )
        self.session.expunge(orm_record)
        refreshed = await self.get_by_id(candidate_id)
        schema = self._to_schema(refreshed)
        detail = await self._resolve_domain_success(
            CandidateUpdateSuccess(self._display_name(refreshed))
        )
        return MutationResponse(detail=detail, data=schema)

    async def delete_candidate(self, candidate_id: int) -> None:
        record = await self.get_by_id(candidate_id)
        await self.delete_by_id(
            candidate_id,
            name=self._display_name(record),
            delete_error_exc=CandidateDeleteError,
            delete_success_exc=CandidateDeleteSuccess,
        )
