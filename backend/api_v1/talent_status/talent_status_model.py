from typing import TYPE_CHECKING
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Boolean
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.talent_status_period_link.talent_status_period_link_model import (
        TalentStatusPeriodLink,
    )


class TalentStatus(IntIdPkMixin, TimestampMixin, Base):
    __tablename__ = "talent_statuses"
    key: Mapped[str] = mapped_column(String(8), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(32), nullable=False)
    description: Mapped[str | None] = mapped_column(String(64), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    _periods: Mapped[list["TalentStatusPeriodLink"]] = relationship(
        back_populates="talent_status",
        lazy="selectin",
    )

    @property
    def periods(self) -> list:
        return [link.talent_period for link in self._periods if link.talent_period]

    def __repr__(self) -> str:
        return f"<TalentStatus(id={self.id}, key='{self.key}', name='{self.name}')>"
