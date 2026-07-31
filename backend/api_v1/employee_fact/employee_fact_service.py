from dataclasses import dataclass

from sqlalchemy import delete as sa_delete
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee_fact.employee_fact_messages import (
    EmployeeFactDeleteSuccess,
    EmployeeFactEmployeeMismatch,
    EmployeeFactNotEditable,
    EmployeeFactNotFound,
    EmployeeFactSaveSuccess,
)
from backend.api_v1.employee_fact.employee_fact_model import EmployeeFact
from backend.api_v1.employee_fact.employee_fact_repository import EmployeeFactRepository
from backend.api_v1.employee_fact.employee_fact_schema import (
    EmployeeFact as EmployeeFactSchema,
)
from backend.api_v1.employee_fact.employee_fact_schema import (
    EmployeeFactCreate,
    EmployeeFactLink,
    EmployeeFactReorder,
    EmployeeFactUpdate,
)
from backend.api_v1.employee_fact_evaluation_link.employee_fact_evaluation_link_model import (
    EmployeeFactEvaluationLink,
)
from backend.api_v1.employee_fact_type.employee_fact_type_messages import (
    EmployeeFactTypeNotFound,
)
from backend.api_v1.employee_fact_type.employee_fact_type_model import EmployeeFactType
from backend.api_v1.review_session.review_session_model import ReviewSession
from backend.api_v1.review_session_employee.review_session_employee_model import (
    ReviewSessionEmployee,
)
from backend.api_v1.review_session_employee.review_session_employee_repository import (
    ReviewSessionEmployeeRepository,
)
from backend.api_v1.review_session_employee.review_session_employee_service import (
    ReviewSessionEmployeeService,
)
from backend.api_v1.review_session_employee_evaluation.review_session_employee_evaluation_messages import (
    EvaluationNotFound,
)
from backend.api_v1.review_session_employee_evaluation.review_session_employee_evaluation_model import (
    ReviewSessionEmployeeEvaluation,
)
from backend.api_v1.review_session_employee_status.review_session_employee_status_model import (
    ReviewSessionEmployeeStatus,
)
from backend.api_v1.review_session_status.review_session_status_model import (
    ReviewSessionStatus,
)

OPEN = "open"


@dataclass(frozen=True)
class _EvaluationContext:
    """The three facts a fact-write needs about a competence, as columns: whose
    review it is, and whether that review (and its session) is still open."""

    employee_id: int
    rse_status_key: str
    session_status_key: str


class EmployeeFactService(BaseService):
    """CRUD for the employee's numbered lines, plus attaching one to a competence.

    Two guards run on every write, and they are separate on purpose:

    - **visibility** — the same people-review scope resolver the review record
      uses (`_visible_employee_ids`). An out-of-scope employee raises NotFound
      rather than 403, so walking sequential ids does not confirm a row exists.
    - **editability** — a fact ATTACHED to a competence lives inside a review, so
      it is frozen once that review (or its session) is closed. A fact still in
      the unlinked pool is employee-scoped and stays editable.

    Authorship never gates anything: anyone who may see the employee's review may
    edit, move or delete any of their facts, whoever wrote it.
    """

    def __init__(
        self,
        repository: EmployeeFactRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ) -> None:
        super().__init__(repository, user=user, session=session)

    # ------------------------------------------------------------------
    # Guards
    # ------------------------------------------------------------------

    def _rse_service(self) -> ReviewSessionEmployeeService:
        return ReviewSessionEmployeeService(
            repository=ReviewSessionEmployeeRepository(session=self.session),
            user=self.user,
            session=self.session,
        )

    async def _assert_employee_visible(self, employee_id: int) -> None:
        await self._rse_service().assert_employee_visible(employee_id)

    async def _evaluation_context(self, evaluation_id: int) -> _EvaluationContext:
        """Resolve a competence's owner + the two statuses in ONE column query.
        Loading the evaluation entity would selectin its review record and drag
        the reviewed employee's whole graph in just to read three values."""
        row = (
            await self.session.execute(
                select(
                    ReviewSessionEmployee.employee_id,
                    ReviewSessionEmployeeStatus.key.label("rse_status_key"),
                    ReviewSessionStatus.key.label("session_status_key"),
                )
                .select_from(ReviewSessionEmployeeEvaluation)
                .join(
                    ReviewSessionEmployee,
                    ReviewSessionEmployee.id
                    == ReviewSessionEmployeeEvaluation.review_session_employee_id,
                )
                .join(
                    ReviewSessionEmployeeStatus,
                    ReviewSessionEmployeeStatus.id
                    == ReviewSessionEmployee.review_session_employee_status_id,
                )
                .join(
                    ReviewSession, ReviewSession.id == ReviewSessionEmployee.session_id
                )
                .join(
                    ReviewSessionStatus,
                    ReviewSessionStatus.id == ReviewSession.status_id,
                )
                .where(ReviewSessionEmployeeEvaluation.id == evaluation_id)
            )
        ).first()
        if row is None:
            raise await self._resolve_domain_error(EvaluationNotFound(evaluation_id))
        return _EvaluationContext(
            employee_id=row.employee_id,
            rse_status_key=row.rse_status_key,
            session_status_key=row.session_status_key,
        )

    async def _assert_evaluation_writable(
        self, evaluation_id: int, fact_employee_id: int
    ) -> None:
        """A competence may receive a fact only when it belongs to the SAME
        employee and its review is still open. The employee check is what stops
        one person's authored line being re-attributed to another's review by a
        typed-in id."""
        ctx = await self._evaluation_context(evaluation_id)
        await self._assert_employee_visible(ctx.employee_id)
        if ctx.employee_id != fact_employee_id:
            raise await self._resolve_domain_error(EmployeeFactEmployeeMismatch())
        if ctx.rse_status_key != OPEN or ctx.session_status_key != OPEN:
            raise await self._resolve_domain_error(EmployeeFactNotEditable())

    async def _get_orm(self, fact_id: int) -> EmployeeFact:
        record = await self.session.get(EmployeeFact, fact_id)
        if record is None:
            raise await self._resolve_domain_error(EmployeeFactNotFound(fact_id))
        await self._assert_employee_visible(record.employee_id)
        return record

    async def _assert_type_exists(self, type_id: int) -> None:
        exists = await self.session.scalar(
            select(EmployeeFactType.id).where(EmployeeFactType.id == type_id)
        )
        if exists is None:
            raise await self._resolve_domain_error(EmployeeFactTypeNotFound(type_id))

    async def _current_link(self, fact_id: int) -> EmployeeFactEvaluationLink | None:
        return await self.session.scalar(
            select(EmployeeFactEvaluationLink).where(
                EmployeeFactEvaluationLink.employee_fact_id == fact_id
            )
        )

    # ------------------------------------------------------------------
    # Reads
    # ------------------------------------------------------------------

    @staticmethod
    def _row_to_schema(row) -> EmployeeFactSchema:
        return EmployeeFactSchema(
            id=row.id,
            employee_id=row.employee_id,
            employee_fact_type_id=row.employee_fact_type_id,
            employee_fact_type_key=row.employee_fact_type_key,
            text=row.text,
            review_session_employee_evaluation_id=getattr(
                row, "review_session_employee_evaluation_id", None
            ),
            sort_order=getattr(row, "sort_order", None) or 0,
        )

    async def get_unlinked(self, employee_id: int) -> list[EmployeeFactSchema]:
        """The employee's pool of facts not yet attached to a competence. Its
        length is the counter shown on the evaluation page."""
        await self._assert_employee_visible(employee_id)
        rows = await self.repository.list_unlinked(employee_id)
        return [self._row_to_schema(r) for r in rows]

    async def facts_by_evaluation(
        self, evaluation_ids: list[int]
    ) -> dict[int, list[EmployeeFactSchema]]:
        """Attached facts grouped by competence — ONE query for the whole page.
        Called by the evaluation service, which has already run its own guard."""
        grouped: dict[int, list[EmployeeFactSchema]] = {}
        for row in await self.repository.list_by_evaluation_ids(evaluation_ids):
            grouped.setdefault(row.review_session_employee_evaluation_id, []).append(
                self._row_to_schema(row)
            )
        return grouped

    async def _reload(self, fact_id: int) -> EmployeeFactSchema:
        row = await self.repository.get_row(fact_id)
        if row is None:
            raise await self._resolve_domain_error(EmployeeFactNotFound(fact_id))
        return self._row_to_schema(row)

    # ------------------------------------------------------------------
    # Writes
    # ------------------------------------------------------------------

    async def create_fact(
        self, payload: EmployeeFactCreate
    ) -> MutationResponse[EmployeeFactSchema]:
        await self._assert_employee_visible(payload.employee_id)
        await self._assert_type_exists(payload.employee_fact_type_id)
        if payload.review_session_employee_evaluation_id is not None:
            await self._assert_evaluation_writable(
                payload.review_session_employee_evaluation_id, payload.employee_id
            )

        actor_id = self.user.id if self.user else payload.employee_id
        record = EmployeeFact(
            employee_id=payload.employee_id,
            employee_fact_type_id=payload.employee_fact_type_id,
            text=payload.text.strip(),
            created_by_id=actor_id,
            updated_by_id=actor_id,
        )
        try:
            self.session.add(record)
            await self.session.flush()
            if payload.review_session_employee_evaluation_id is not None:
                self.session.add(
                    EmployeeFactEvaluationLink(
                        employee_fact_id=record.id,
                        review_session_employee_evaluation_id=payload.review_session_employee_evaluation_id,
                        sort_order=await self.repository.next_sort_order(
                            payload.review_session_employee_evaluation_id,
                            payload.employee_fact_type_id,
                        ),
                    )
                )
            await self.session.commit()
        except Exception:
            await self.session.rollback()
            raise

        schema = await self._reload(record.id)
        detail = await self._resolve_domain_success(EmployeeFactSaveSuccess())
        return MutationResponse(detail=detail, data=schema)

    async def update_fact(
        self, fact_id: int, payload: EmployeeFactUpdate
    ) -> MutationResponse[EmployeeFactSchema]:
        record = await self._get_orm(fact_id)
        link = await self._current_link(fact_id)
        if link is not None:
            await self._assert_evaluation_writable(
                link.review_session_employee_evaluation_id, record.employee_id
            )
        if payload.employee_fact_type_id is not None:
            await self._assert_type_exists(payload.employee_fact_type_id)

        sent = payload.model_dump(exclude_unset=True)
        if "text" in sent and payload.text is not None:
            record.text = payload.text.strip()
        if (
            "employee_fact_type_id" in sent
            and payload.employee_fact_type_id is not None
        ):
            record.employee_fact_type_id = payload.employee_fact_type_id
            # A kind change moves the row to the OTHER list of the same
            # competence, so its position must be recomputed there.
            if link is not None:
                link.sort_order = await self.repository.next_sort_order(
                    link.review_session_employee_evaluation_id,
                    payload.employee_fact_type_id,
                )
        if self.user:
            record.updated_by_id = self.user.id

        try:
            await self.session.commit()
        except Exception:
            await self.session.rollback()
            raise

        schema = await self._reload(fact_id)
        detail = await self._resolve_domain_success(EmployeeFactSaveSuccess())
        return MutationResponse(detail=detail, data=schema)

    async def delete_fact(self, fact_id: int) -> MutationResponse[None]:
        record = await self._get_orm(fact_id)
        link = await self._current_link(fact_id)
        if link is not None:
            await self._assert_evaluation_writable(
                link.review_session_employee_evaluation_id, record.employee_id
            )
        try:
            await self.session.delete(record)
            await self.session.commit()
        except Exception:
            await self.session.rollback()
            raise
        detail = await self._resolve_domain_success(EmployeeFactDeleteSuccess())
        return MutationResponse(detail=detail, data=None)

    async def link_fact(
        self, fact_id: int, payload: EmployeeFactLink
    ) -> MutationResponse[EmployeeFactSchema]:
        """Attach a fact to a competence — the drop at the end of a drag. Moving
        between competences is the same operation: the fact has at most one link,
        so this updates it in place."""
        record = await self._get_orm(fact_id)
        await self._assert_evaluation_writable(
            payload.review_session_employee_evaluation_id, record.employee_id
        )
        link = await self._current_link(fact_id)
        # Leaving a competence that is already frozen must be refused too, or a
        # closed review could be emptied from the pool side.
        if (
            link is not None
            and link.review_session_employee_evaluation_id
            != payload.review_session_employee_evaluation_id
        ):
            await self._assert_evaluation_writable(
                link.review_session_employee_evaluation_id, record.employee_id
            )

        sort_order = payload.sort_order
        if sort_order is None:
            sort_order = await self.repository.next_sort_order(
                payload.review_session_employee_evaluation_id,
                record.employee_fact_type_id,
            )
        try:
            if link is None:
                self.session.add(
                    EmployeeFactEvaluationLink(
                        employee_fact_id=fact_id,
                        review_session_employee_evaluation_id=payload.review_session_employee_evaluation_id,
                        sort_order=sort_order,
                    )
                )
            else:
                link.review_session_employee_evaluation_id = (
                    payload.review_session_employee_evaluation_id
                )
                link.sort_order = sort_order
            if self.user:
                record.updated_by_id = self.user.id
            await self.session.commit()
        except Exception:
            await self.session.rollback()
            raise

        schema = await self._reload(fact_id)
        detail = await self._resolve_domain_success(EmployeeFactSaveSuccess())
        return MutationResponse(detail=detail, data=schema)

    async def unlink_fact(self, fact_id: int) -> MutationResponse[EmployeeFactSchema]:
        """Send a fact back to the pool. Deletes the LINK row only — the authored
        text and its history are untouched."""
        record = await self._get_orm(fact_id)
        link = await self._current_link(fact_id)
        if link is not None:
            await self._assert_evaluation_writable(
                link.review_session_employee_evaluation_id, record.employee_id
            )
            try:
                await self.session.delete(link)
                if self.user:
                    record.updated_by_id = self.user.id
                await self.session.commit()
            except Exception:
                await self.session.rollback()
                raise

        schema = await self._reload(fact_id)
        detail = await self._resolve_domain_success(EmployeeFactSaveSuccess())
        return MutationResponse(detail=detail, data=schema)

    async def reorder(
        self, payload: EmployeeFactReorder
    ) -> MutationResponse[list[EmployeeFactSchema]]:
        """Renumber ONE competence's list of ONE kind from the sent order. The
        array index becomes `sort_order`; ids that are not attached to that
        competence (or belong to another employee) are ignored rather than
        silently moved."""
        ctx = await self._evaluation_context(
            payload.review_session_employee_evaluation_id
        )
        await self._assert_employee_visible(ctx.employee_id)
        if ctx.rse_status_key != OPEN or ctx.session_status_key != OPEN:
            raise await self._resolve_domain_error(EmployeeFactNotEditable())

        links = (
            (
                await self.session.execute(
                    select(EmployeeFactEvaluationLink)
                    .join(
                        EmployeeFact,
                        EmployeeFact.id == EmployeeFactEvaluationLink.employee_fact_id,
                    )
                    .where(
                        EmployeeFactEvaluationLink.review_session_employee_evaluation_id
                        == payload.review_session_employee_evaluation_id,
                        EmployeeFact.employee_fact_type_id
                        == payload.employee_fact_type_id,
                    )
                )
            )
            .scalars()
            .all()
        )
        by_fact = {link.employee_fact_id: link for link in links}
        try:
            index = 0
            for fact_id in payload.employee_fact_ids:
                link = by_fact.get(fact_id)
                if link is None:
                    continue
                link.sort_order = index
                index += 1
            await self.session.commit()
        except Exception:
            await self.session.rollback()
            raise

        grouped = await self.facts_by_evaluation(
            [payload.review_session_employee_evaluation_id]
        )
        items = [
            f
            for f in grouped.get(payload.review_session_employee_evaluation_id, [])
            if f.employee_fact_type_id == payload.employee_fact_type_id
        ]
        detail = await self._resolve_domain_success(EmployeeFactSaveSuccess())
        return MutationResponse(detail=detail, data=items)

    async def delete_linked_facts(self, evaluation_id: int, type_id: int) -> None:
        """Drop one competence's whole list of one kind. Used by
        `flip_competence`, which used to NULL the matching text column — the
        destructive semantics are preserved deliberately, so re-rating a
        competence out of a summary side still clears what was written for it.
        Runs inside the caller's transaction (no commit here)."""
        fact_ids = (
            (
                await self.session.execute(
                    select(EmployeeFact.id)
                    .join(
                        EmployeeFactEvaluationLink,
                        EmployeeFactEvaluationLink.employee_fact_id == EmployeeFact.id,
                    )
                    .where(
                        EmployeeFactEvaluationLink.review_session_employee_evaluation_id
                        == evaluation_id,
                        EmployeeFact.employee_fact_type_id == type_id,
                    )
                )
            )
            .scalars()
            .all()
        )
        if not fact_ids:
            return
        await self.session.execute(
            sa_delete(EmployeeFact).where(EmployeeFact.id.in_(fact_ids))
        )
