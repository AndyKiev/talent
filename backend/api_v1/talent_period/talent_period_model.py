from typing import TYPE_CHECKING
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Boolean
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.talent_status_period_link.talent_status_period_link_model import TalentStatusPeriodLink


class TalentPeriod(IntIdPkMixin, TimestampMixin, Base):

    name: Mapped[str] = mapped_column(String(32), nullable=False)
    description: Mapped[str | None] = mapped_column(String(64), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    _statuses: Mapped[list["TalentStatusPeriodLink"]] = relationship(
        back_populates="talent_period",
        lazy="selectin",
    )

    @property
    def statuses(self) -> list:
        return [link.talent_status for link in self._statuses if link.talent_status]

    def __repr__(self) -> str:
        return f"<TalentPeriod(id={self.id}, name='{self.name}')>"