from typing import TYPE_CHECKING, List

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.employee_language.employee_language_model import (
        EmployeeLanguage,
    )


class EmployeeLanguageProfile(IntIdPkMixin, TimestampMixin, Base):
    """One-to-one container for an employee's declared foreign languages."""

    __tablename__ = "employee_language_profiles"

    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id"), nullable=False, unique=True
    )

    languages: Mapped[List["EmployeeLanguage"]] = relationship(
        back_populates="profile",
        lazy="selectin",
        cascade="all, delete-orphan",
    )
