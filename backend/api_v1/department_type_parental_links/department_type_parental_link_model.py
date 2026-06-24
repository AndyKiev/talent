from sqlalchemy import Integer, Boolean, UniqueConstraint, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin


class DepartmentTypeParentalLink(IntIdPkMixin, TimestampMixin, Base):
    # __tablename__ = "department_type_parental_links"
    __table_args__ = (
        UniqueConstraint(
            "child_id", "parent_id", name="uq_dept_type_parental_link_child_parent"
        ),
    )

    child_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("department_types.id"), nullable=False
    )
    parent_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("department_types.id"), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    def __repr__(self) -> str:
        return f"<DepartmentTypeParentalLink(child_id={self.child_id}, parent_id={self.parent_id})>"
