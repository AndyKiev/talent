from typing import TYPE_CHECKING, Any, Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Boolean, ForeignKey, JSON
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.setting_value_type.setting_value_type_model import (
        SettingValueType,
    )


class AppSetting(IntIdPkMixin, TimestampMixin, Base):
    """
    A single application-level setting. The value is stored as JSON so it can
    hold a boolean, integer, date string, or a whole config object; the linked
    `value_type` says how to read it. Set at the application level (not tied to
    any session/employee).
    """

    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    value: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    value_type_id: Mapped[int] = mapped_column(
        ForeignKey("setting_value_types.id", ondelete="RESTRICT"), nullable=False
    )
    # Self-referential parent for "multi-story" settings: a child setting (e.g. a
    # per-surface photo toggle) hangs under a parent boolean. The developer UI
    # nests children under their parent in an accordion and disables them while
    # the parent is off; a child is "effectively on" only when it AND every
    # ancestor are on. SET NULL on parent delete so children are never silently
    # destroyed (they just float up to top level).
    parent_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("app_settings.id", ondelete="SET NULL"), nullable=True
    )
    # Translation keys for the developer-tab UI (resolved via getString).
    label_key: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    description_key: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_by: Mapped[Optional[int]] = mapped_column(
        ForeignKey("employees.id", ondelete="SET NULL"), nullable=True
    )

    value_type: Mapped["SettingValueType"] = relationship(
        back_populates="settings",
        lazy="selectin",
    )

    @property
    def value_type_key(self) -> Optional[str]:
        # Read-only mirror so the schema can expose the type key without an
        # extra join — drives the type-aware editor on the frontend.
        return self.value_type.key if self.value_type else None

    def __repr__(self) -> str:
        return f"<AppSetting(id={self.id}, key='{self.key}')>"
