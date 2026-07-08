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
    """One-to-one container for a PERSON's declared foreign languages. The HTTP
    API still speaks employee_id; the service resolves it to person_id. The
    profile dies with the person (ON DELETE CASCADE)."""

    __tablename__ = "employee_language_profiles"

    person_id: Mapped[int] = mapped_column(
        ForeignKey("persons.id", ondelete="CASCADE"), nullable=False, unique=True
    )

    languages: Mapped[List["EmployeeLanguage"]] = relationship(
        back_populates="profile",
        lazy="selectin",
        cascade="all, delete-orphan",
    )
