from typing import TYPE_CHECKING, Optional

from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin

if TYPE_CHECKING:
    from backend.api_v1.employee_language_profile.employee_language_profile_model import (
        EmployeeLanguageProfile,
    )
    from backend.api_v1.language_level.language_level_model import LanguageLevel


class EmployeeLanguage(IntIdPkMixin, Base):
    """A single foreign language an employee declared, with its CEFR level.

    Belongs to one EmployeeLanguageProfile; references one LanguageLevel.
    """

    __tablename__ = "employee_languages"

    profile_id: Mapped[int] = mapped_column(
        ForeignKey("employee_language_profiles.id"), nullable=False
    )
    language: Mapped[str] = mapped_column(String(32), nullable=False)
    level_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("language_levels.id"), nullable=True
    )

    profile: Mapped["EmployeeLanguageProfile"] = relationship(
        back_populates="languages",
        lazy="selectin",
    )
    level: Mapped[Optional["LanguageLevel"]] = relationship(lazy="selectin")
