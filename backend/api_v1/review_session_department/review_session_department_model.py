from typing import TYPE_CHECKING
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey, UniqueConstraint
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.review_session.review_session_model import ReviewSession
    from backend.api_v1.department.department_model import Department


class ReviewSessionDepartment(IntIdPkMixin, TimestampMixin, Base):
    """Links a review session to one or more departments.

    When `review_session_filter_by_department` is enabled, only employees whose
    main department (EmployeeDepartment row) matches one of the
    linked departments are included when the session is opened.
    """

    __tablename__ = "review_session_departments"

    __table_args__ = (
        UniqueConstraint(
            "session_id",
            "department_id",
            name="uq_review_session_department",
        ),
    )

    session_id: Mapped[int] = mapped_column(
        ForeignKey("review_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    department_id: Mapped[int] = mapped_column(
        ForeignKey("departments.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    session: Mapped["ReviewSession"] = relationship(lazy="selectin")
    department: Mapped["Department"] = relationship(lazy="selectin")

    def __repr__(self) -> str:
        return (
            f"<ReviewSessionDepartment("
            f"id={self.id}, "
            f"session_id={self.session_id}, "
            f"department_id={self.department_id}"
            f")>"
        )
