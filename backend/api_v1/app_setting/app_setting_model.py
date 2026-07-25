from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, Boolean, ForeignKey, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.setting_value_type.setting_value_type_model import (
        SettingValueType,
    )
    from backend.api_v1.table_relationship_links.app_setting_user_group_link_model import (
        AppSettingUserGroupLink,
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
    value: Mapped[Any | None] = mapped_column(JSON, nullable=True)
    value_type_id: Mapped[int] = mapped_column(
        ForeignKey("setting_value_types.id", ondelete="RESTRICT"), nullable=False
    )
    # Self-referential parent for "multi-story" settings: a child setting (e.g. a
    # per-surface photo toggle) hangs under a parent boolean. The developer UI
    # nests children under their parent in an accordion and disables them while
    # the parent is off; a child is "effectively on" only when it AND every
    # ancestor are on. SET NULL on parent delete so children are never silently
    # destroyed (they just float up to top level).
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("app_settings.id", ondelete="SET NULL"), nullable=True
    )
    # Translation keys for the developer-tab UI (resolved via getString).
    label_key: Mapped[str | None] = mapped_column(String(64), nullable=True)
    description_key: Mapped[str | None] = mapped_column(String(64), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # Names an option set (e.g. "job_categories", "employee_statuses"). When set,
    # the developer Settings page renders a MULTI-SELECT bound to that option set
    # instead of the raw JSON editor; the value is stored as a JSON list of the
    # chosen option keys/names (value_type must be "json").
    options_source: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # When False the setting can NEVER be made user-overridable: the per-user
    # toggle is hidden in the UI and the backend refuses to enable it. App-only.
    user_override_allowed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    # When ON, an individual employee may override this setting for themselves
    # (a user_settings row). The global value here is BOTH the default AND, for
    # integers, the cap (user value is clamped to [1, this value]). When OFF the
    # global value always applies and any existing user override lies dormant.
    user_overridable: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    # ── Visibility (same 3-mode system as Menu) ────────────────────────────
    visible_to_all_groups: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    visible_to_regular: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )

    user_group_links: Mapped[list["AppSettingUserGroupLink"]] = relationship(
        back_populates="app_setting",
        lazy="selectin",
        cascade="all, delete-orphan",
    )

    @property
    def allowed_group_ids(self) -> list[int]:
        """User-group ids allowed to see this setting (empty when all-groups mode)."""
        return [link.user_group_id for link in self.user_group_links]

    created_by: Mapped[int | None] = mapped_column(
        ForeignKey("employees.id", ondelete="SET NULL"), nullable=True
    )

    value_type: Mapped["SettingValueType"] = relationship(
        back_populates="settings",
        lazy="selectin",
    )

    @property
    def value_type_key(self) -> str | None:
        # Read-only mirror so the schema can expose the type key without an
        # extra join — drives the type-aware editor on the frontend.
        return self.value_type.key if self.value_type else None

    def __repr__(self) -> str:
        return f"<AppSetting(id={self.id}, key='{self.key}')>"
