from typing import Optional, List, Tuple

from sqlalchemy import select
from sqlalchemy.orm import raiseload
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee.employee_model import Employee
from backend.api_v1.review_session_employee_comment.review_session_employee_comment_repository import (
    ReviewSessionEmployeeCommentRepository,
)
from backend.api_v1.review_session_employee_comment.review_session_employee_comment_model import (
    ReviewSessionEmployeeComment as CommentModel,
)
from backend.api_v1.review_session_employee_comment.review_session_employee_comment_schema import (
    ReviewCommentSchema,
    ReviewCommentCreate,
    ReviewCommentUpdate,
)
from backend.api_v1.review_session_employee_comment.review_session_employee_comment_messages import (
    ReviewCommentNotFound,
    ReviewCommentReviewNotOpen,
    ReviewCommentRoleRequired,
    ReviewCommentNotOwner,
    ReviewCommentInvalid,
)
from backend.api_v1.review_session_employee_comment.review_session_employee_comment_messages import (
    ReviewCommentCreateSuccess,
    ReviewCommentUpdateSuccess,
    ReviewCommentDeleteSuccess,
)
from backend.api_v1.review_session_employee.review_session_employee_model import (
    ReviewSessionEmployee as RSEModel,
)
from backend.api_v1.review_session_employee.review_session_employee_repository import (
    ReviewSessionEmployeeRepository,
)
from backend.api_v1.review_session_employee.review_session_employee_service import (
    ReviewSessionEmployeeService,
)
from backend.api_v1.review_session_employee.review_session_employee_messages import (
    ReviewSessionEmployeeNotFound,
)

# Which visibility scopes each author role may pick. Three tiers per role:
# private (author only) -> role-specific middle scope -> public (everyone who can
# open the review). 'to_subject' is oversight-only (author + the reviewed
# employee); 'to_oversight' is supervision-only (author + oversight reviewers).
# Full rules matrix: .claude/skills/review-comments/SKILL.md
VISIBILITY_BY_ROLE = {
    "oversight": {"private", "to_subject", "public"},
    "supervision": {"private", "to_oversight", "public"},
}
# Active-role link_target -> the author_role label frozen on the comment.
LINK_TARGET_TO_ROLE = {"employee": "oversight", "department": "supervision"}


class ReviewSessionEmployeeCommentService(BaseService):
    def __init__(
        self,
        repository: ReviewSessionEmployeeCommentRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    def _rse_service(self) -> ReviewSessionEmployeeService:
        return ReviewSessionEmployeeService(
            repository=ReviewSessionEmployeeRepository(session=self.session),
            user=self.user,
            session=self.session,
        )

    async def _load_rse(self, rse_id: int) -> RSEModel:
        """Resolve the parent review row with session/employee selectin-loaded,
        after the people-review visibility guard (out-of-scope -> 404, no leak)."""
        rse_service = self._rse_service()
        await rse_service.assert_rse_visible(rse_id)
        rse = await ReviewSessionEmployeeRepository(session=self.session).get_by_id(
            rse_id
        )
        if rse is None:
            raise await self._resolve_domain_error(
                ReviewSessionEmployeeNotFound(rse_id)
            )
        return rse

    async def _assert_open(self, rse: RSEModel) -> None:
        session_status = rse.session.status if rse.session else None
        if rse.status != "open" or session_status != "open":
            raise await self._resolve_domain_error(ReviewCommentReviewNotOpen())

    def _validated_visibility(self, value: Optional[str], author_role: str) -> str:
        v = value or "private"
        if v not in VISIBILITY_BY_ROLE.get(author_role, {"private", "public"}):
            raise ReviewCommentInvalid()
        return v

    def _to_schema(
        self, c: CommentModel, author_name: Optional[str] = None
    ) -> ReviewCommentSchema:
        # author_name passed in (list path) avoids touching c.author, whose
        # lazy="selectin" would drag the author's whole Employee graph. The single
        # comment mutation paths still fall back to the loaded relationship.
        schema = ReviewCommentSchema.model_validate(c)
        if author_name is not None:
            schema.author_name = author_name
        elif c.author:
            schema.author_name = c.author.name
        return schema

    # ---- viewer classification -------------------------------------------------
    async def _viewer_flags(self, employee_id: int) -> Tuple[bool, bool, bool]:
        """(is_subject, is_oversighter, is_supervisor) for the current user vs this
        employee. Oversighter/supervisor are decided by the viewer's ACTIVE mode AND
        the employee being inside that mode's expanded scope, so a stale/foreign
        context (which collapses _visible_employee_ids to self) classifies as neither.
        """
        rse_service = self._rse_service()
        me = self.user.id if self.user else None
        is_subject = me is not None and me == employee_id

        visible = await rse_service._visible_employee_ids()
        in_scope = employee_id in visible and employee_id != me

        active_role = await rse_service.get_active_role()
        link_target = active_role.link_target if active_role else None
        is_oversighter = in_scope and link_target == "employee"
        is_supervisor = in_scope and link_target == "department"
        return is_subject, is_oversighter, is_supervisor

    def _can_see(
        self,
        c: CommentModel,
        me: Optional[int],
        is_subject: bool,
        is_oversighter: bool,
        is_supervisor: bool,
    ) -> bool:
        if c.author_id == me:
            return True  # author always sees own notes (any scope)
        if c.visibility == "private":
            return False  # someone else's private note is never visible
        if c.visibility == "public":
            # public = everyone who can open this review: the subject,
            # oversight reviewers and supervisors alike.
            return is_subject or is_oversighter or is_supervisor
        if c.visibility == "to_subject":
            # oversight-only scope: author (handled above) + the reviewed employee.
            return is_subject
        if c.visibility == "to_oversight":
            # supervision-only scope: author (handled above) + oversight reviewers —
            # not the subject, not other supervisors.
            return is_oversighter
        return False

    # ---- read ------------------------------------------------------------------
    async def _author_names(self, author_ids: set[int]) -> dict[int, str]:
        """{employee_id: name} for the given author ids via a COLUMN-ONLY query —
        never the Employee entity (its selectin graph is hundreds of queries)."""
        if not author_ids:
            return {}
        rows = await self.session.execute(
            select(Employee.id, Employee.name).where(Employee.id.in_(author_ids))
        )
        return {row[0]: row[1] for row in rows.all()}

    async def list_comments(self, rse_id: int) -> List[ReviewCommentSchema]:
        # Guard visibility (out-of-scope -> 404), then load ONLY the reviewee id —
        # not the RSE entity (whose selectin employee/evaluations cost ~112 queries).
        # list needs just employee_id (viewer classification) + the comment rows.
        rse_service = self._rse_service()
        await rse_service.assert_rse_visible(rse_id)
        employee_id = await self.session.scalar(
            select(RSEModel.employee_id).where(RSEModel.id == rse_id)
        )
        if employee_id is None:
            raise await self._resolve_domain_error(
                ReviewSessionEmployeeNotFound(rse_id)
            )

        is_subject, is_oversighter, is_supervisor = await self._viewer_flags(
            employee_id
        )
        me = self.user.id if self.user else None
        # raiseload(author): CommentModel.author is lazy="selectin"; without this,
        # loading the rows hydrates every author's full Employee graph. Names come
        # from the column-only batch below, for the visible rows only.
        rows = (
            await self.session.scalars(
                select(CommentModel)
                .options(raiseload(CommentModel.author))
                .where(CommentModel.review_session_employee_id == rse_id)
                .order_by(CommentModel.created_at.asc(), CommentModel.id.asc())
            )
        ).all()
        visible = [
            c
            for c in rows
            if self._can_see(c, me, is_subject, is_oversighter, is_supervisor)
        ]
        author_names = await self._author_names({c.author_id for c in visible})
        return [self._to_schema(c, author_names.get(c.author_id, "")) for c in visible]

    # ---- create ----------------------------------------------------------------
    async def create_comment(
        self, rse_id: int, payload: ReviewCommentCreate
    ) -> MutationResponse[ReviewCommentSchema]:
        rse = await self._load_rse(rse_id)

        # Author must be an active oversight/supervision reviewer of THIS employee,
        # never the employee themselves. Reuse the tested visibility resolver:
        # the expanded scope minus self gives oversight+supervision-only & never-self,
        # plus the stale-context-collapses-to-self safety, for free.
        rse_service = self._rse_service()
        active_role = await rse_service.get_active_role()
        visible = await rse_service._visible_employee_ids()
        me = self.user.id if self.user else None
        in_scope = rse.employee_id in visible and rse.employee_id != me
        author_role = (
            LINK_TARGET_TO_ROLE.get(active_role.link_target) if active_role else None
        )
        if not in_scope or author_role is None:
            raise await self._resolve_domain_error(ReviewCommentRoleRequired())

        await self._assert_open(rse)

        visibility = self._validated_visibility(payload.visibility, author_role)
        body = (payload.body or "").strip()
        if not body:
            raise await self._resolve_domain_error(ReviewCommentInvalid())

        record = CommentModel(
            review_session_employee_id=rse_id,
            author_id=me,
            author_role=author_role,
            visibility=visibility,
            body=body,
        )
        self.session.add(record)
        await self.session.commit()
        # Re-fetch so the author relationship is selectin-loaded for _to_schema.
        record = await self.repository.get_by_id(record.id)
        detail = await self._resolve_domain_success(ReviewCommentCreateSuccess())
        return MutationResponse(detail=detail, data=self._to_schema(record))

    # ---- update (owner only) ---------------------------------------------------
    async def _own_comment(self, rse_id: int, comment_id: int) -> CommentModel:
        rse = await self._load_rse(rse_id)
        comment = await self.repository.get_by_id(comment_id)
        if comment is None or comment.review_session_employee_id != rse_id:
            raise await self._resolve_domain_error(ReviewCommentNotFound(comment_id))
        if self.user is None or comment.author_id != self.user.id:
            raise await self._resolve_domain_error(ReviewCommentNotOwner())
        await self._assert_open(rse)
        return comment

    async def update_comment(
        self, rse_id: int, comment_id: int, payload: ReviewCommentUpdate
    ) -> MutationResponse[ReviewCommentSchema]:
        comment = await self._own_comment(rse_id, comment_id)
        if payload.visibility is not None:
            comment.visibility = self._validated_visibility(
                payload.visibility, comment.author_role
            )
        if payload.body is not None:
            body = payload.body.strip()
            if not body:
                raise await self._resolve_domain_error(ReviewCommentInvalid())
            comment.body = body
        await self.session.commit()
        comment = await self.repository.get_by_id(comment.id)
        detail = await self._resolve_domain_success(ReviewCommentUpdateSuccess())
        return MutationResponse(detail=detail, data=self._to_schema(comment))

    # ---- delete (owner only) ---------------------------------------------------
    async def delete_comment(
        self, rse_id: int, comment_id: int
    ) -> MutationResponse[None]:
        comment = await self._own_comment(rse_id, comment_id)
        await self.session.delete(comment)
        await self.session.commit()
        detail = await self._resolve_domain_success(ReviewCommentDeleteSuccess())
        return MutationResponse(detail=detail, data=None)
