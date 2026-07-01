from typing import TYPE_CHECKING, Any, Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey, JSON, UniqueConstraint
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.app_setting.app_setting_model import AppSetting


class UserSetting(IntIdPkMixin, TimestampMixin, Base):
    """
    A single employee's override of an app setting. Exists only when the user has
    chosen a personal value for a setting the developer marked `user_overridable`.
    Absence of a row means "use the global default". The value is stored as JSON
    (same shape as the parent AppSetting). For integers the value is kept within
    [1, global cap] — clamped down automatically when the admin lowers the cap.
    """

    __tablename__ = "user_settings"

    __table_args__ = (
        UniqueConstraint(
            "employee_id",
            "app_setting_id",
            name="uq_user_setting_employee_app_setting",
        ),
    )

    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    app_setting_id: Mapped[int] = mapped_column(
        ForeignKey("app_settings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    value: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)

    app_setting: Mapped["AppSetting"] = relationship(lazy="selectin")

    def __repr__(self) -> str:
        return (
            f"<UserSetting(id={self.id}, employee_id={self.employee_id}, "
            f"app_setting_id={self.app_setting_id})>"
        )
