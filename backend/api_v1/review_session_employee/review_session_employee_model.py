from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.employee.employee_model import Employee
    from backend.api_v1.review_session.review_session_model import ReviewSession
    from backend.api_v1.review_session_employee_dimension.review_session_employee_dimension_model import (
        ReviewSessionEmployeeDimension,
    )
    from backend.api_v1.review_session_employee_evaluation.review_session_employee_evaluation_model import (
        ReviewSessionEmployeeEvaluation,
    )
    from backend.api_v1.review_session_employee_feedback.review_session_employee_feedback_model import (
        ReviewSessionEmployeeFeedback,
    )
    from backend.api_v1.review_session_employee_result.review_session_employee_result_model import (
        ReviewSessionEmployeeResult,
    )
    from backend.api_v1.review_session_employee_status.review_session_employee_status_model import (
        ReviewSessionEmployeeStatus,
    )


class ReviewSessionEmployee(IntIdPkMixin, TimestampMixin, Base):
    __tablename__ = "review_session_employees"
    # One review row per (session, employee): hard backstop behind the
    # add_employee check-then-insert guard (prevents concurrent double-add).
    __table_args__ = (
        UniqueConstraint("session_id", "employee_id", name="uq_rse_session_employee"),
    )
    session_id: Mapped[int] = mapped_column(
        ForeignKey("review_sessions.id"), nullable=False
    )
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    # Lifecycle status as a real FK. Was a free-text varchar whose three legal
    # values lived only as string literals in the service.
    review_session_employee_status_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("review_session_employee_statuses.id"),
        nullable=False,
    )

    # Presentation-queue order for oversight mode (multiples of 10: 10, 20, 30 …).
    # NULL sorts last, so a newly-added employee lands at the end of the queue.
    queue_position: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # NOTE: there are deliberately no `employee_feedback` / `manager_feedback`
    # columns here any more. They were the same concept twice, so they became
    # `review_session_employee_feedbacks` rows keyed by a feedback TYPE
    # (employee / manager) — adding a third voice is now a row, not a migration.
    # NOTE: there is deliberately no `results_achievements` column here any more.
    # The results / achievements moved to `review_session_employee_results` — one
    # row each, with the position in `sort_order` instead of "1. " / "2. "
    # prefixes baked into the text, so inserting or deleting a line renumbers
    # nothing. Still REVIEW-scoped: what someone achieved is said about a
    # specific period.
    # NOTE: there is deliberately no `development_plan` column here any more. The
    # individual development plan (once a JSON array of missions on this row)
    # moved to the employee-scoped `employee_missions` tables, because a plan
    # belongs to the person, not to one review session — see
    # `backend/api_v1/aa__process_descriptions/employee_missions_design.md`.
    #
    # NOTE: there is deliberately no `trainings` column here any more. Recommended
    # trainings moved to the EMPLOYEE-scoped `employee_recommended_trainings`
    # (free-text description + status + is_active per row). Employee-scoped for
    # the same reason as the missions: advice about someone's development
    # outlives the session that raised it, and the same list is shown in the
    # employee card. It also stays usable with the training module switched off.
    # NOTE: there is deliberately no `dimensions` column here any more.
    # The strong / to-develop competence summary (once a JSON blob referencing
    # competences by a free-text `dimension_key`, with comments nested as arrays)
    # moved to the `review_session_employee_dimensions` +
    # `review_session_employee_dimension_comments` tables: real FKs into
    # `review_dimensions`, explicit ordering, and no nullable columns. The
    # `dimensions` field on the read schema is now that assembled list.
    # Per-review opt-in: when True the two summary selects offer the FULL competence
    # list (not just the top/bottom ranked) and a star re-rating no longer removes a
    # picked competence + its facts. Only usable when the global app setting
    # `people_review_summary_full_competence_list` is on (that gates the switch's
    # visibility). Default False → the review behaves as before.
    summary_full_competence_list: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false", default=False
    )

    session: Mapped["ReviewSession"] = relationship(
        back_populates="employees",
        lazy="selectin",
    )
    employee: Mapped["Employee"] = relationship(lazy="selectin")
    evaluations: Mapped[list["ReviewSessionEmployeeEvaluation"]] = relationship(
        back_populates="review_session_employee",
        lazy="selectin",
    )
    # lazy="noload" ON PURPOSE. The session roster loads many RSE rows at once;
    # selectin-loading the summary (and each row's comments, and each row's
    # dimension) per record would reintroduce the people-review N+1. The detail
    # paths load it explicitly via _load_rse_dimensions instead.
    rse_dimensions: Mapped[list["ReviewSessionEmployeeDimension"]] = relationship(
        cascade="all, delete-orphan",
        lazy="noload",
    )
    # Same noload reasoning: the roster loads many RSE rows and must not pay for
    # each one's result list. The detail paths load it explicitly.
    results: Mapped[list["ReviewSessionEmployeeResult"]] = relationship(
        back_populates="review_session_employee",
        cascade="all, delete-orphan",
        lazy="noload",
    )
    # selectin (not noload) because `status` below reads it on EVERY record,
    # including the roster: three seeded rows, so one extra query for the whole
    # page, not one per row.
    status_rel: Mapped["ReviewSessionEmployeeStatus"] = relationship(
        back_populates="review_session_employees",
        lazy="selectin",
    )
    feedbacks: Mapped[list["ReviewSessionEmployeeFeedback"]] = relationship(
        back_populates="review_session_employee",
        cascade="all, delete-orphan",
        lazy="noload",
    )

    @property
    def status(self) -> str:
        """The status KEY ('open' / 'reviewed' / 'closed').

        READ-ONLY on purpose. Every comparison in the service and every status
        the API returns is the key, so keeping this property means the move to a
        FK changed no read site at all. Writes must go through
        `review_session_employee_status_id` (resolved by key), which is why there
        is no setter — an accidental `record.status = "open"` should fail loudly
        rather than silently write nothing.
        """
        return self.status_rel.key if self.status_rel else ""
