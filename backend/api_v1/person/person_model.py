from typing import TYPE_CHECKING
from datetime import date

from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, Date, ForeignKey, UniqueConstraint

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.employee.employee_model import Employee
    from backend.api_v1.sex.sex_model import Sex
    from backend.api_v1.marital_status.marital_status_model import MaritalStatus


class Person(IntIdPkMixin, TimestampMixin, Base):
    """Physical person behind one or more employee records.

    name_dedupe_no keeps (last_name, first_name) unique for the rare real
    namesakes: the first person gets 0, the next 1, and so on.
    """

    __tablename__ = "persons"
    __table_args__ = (
        UniqueConstraint(
            "last_name",
            "first_name",
            "name_dedupe_no",
            name="uq_persons_last_first_dedupe",
        ),
    )

    first_name: Mapped[str] = mapped_column(String(64), nullable=False)
    last_name: Mapped[str] = mapped_column(String(64), nullable=False)
    patronymic: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # Sex lookup (1=male, 2=female). API keeps exchanging the 'male'/'female'
    # string via the `sex` property below.
    sex_id: Mapped[int | None] = mapped_column(
        ForeignKey("sexes.id"), nullable=True, default=None
    )
    # Marital-status lookup (1=married, 2=not_married). API exchanges the
    # 'married'/'not_married' string via the `marital_status` property below.
    marital_status_id: Mapped[int | None] = mapped_column(
        ForeignKey("marital_statuses.id"), nullable=True, default=None
    )
    birth_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    name_dedupe_no: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )

    employees: Mapped[list["Employee"]] = relationship(
        back_populates="person",
        lazy="selectin",
    )

    sex_ref: Mapped["Sex | None"] = relationship(
        back_populates="persons",
        lazy="selectin",
    )

    marital_status_ref: Mapped["MaritalStatus | None"] = relationship(
        back_populates="persons",
        lazy="selectin",
    )

    @property
    def sex(self) -> str | None:
        # Read-only 'male' / 'female' mirror of the sex lookup — keeps the API
        # and Pydantic schemas string-based while the DB stores sex_id.
        return self.sex_ref.name if self.sex_ref else None

    @property
    def marital_status(self) -> str | None:
        # Read-only 'married' / 'not_married' mirror of the lookup.
        return self.marital_status_ref.name if self.marital_status_ref else None

    def __repr__(self) -> str:
        return (
            f"<Person(id={self.id}, last_name='{self.last_name}', "
            f"first_name='{self.first_name}', dedupe={self.name_dedupe_no})>"
        )
