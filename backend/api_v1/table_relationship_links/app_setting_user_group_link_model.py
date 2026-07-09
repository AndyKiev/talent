from typing import TYPE_CHECKING
from sqlalchemy.orm import mapped_column, Mapped, relationship
from sqlalchemy import UniqueConstraint, ForeignKey
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.app_setting.app_setting_model import AppSetting


class AppSettingUserGroupLink(IntIdPkMixin, TimestampMixin, Base):
    """
    Which user-groups may see a given app setting — by group **id**, never name.

    Follows the same visibility rules as MenuUserGroupLink:
      - visible_to_all_groups = True  → everyone with >=1 group; links ignored.
      - visible_to_regular = True     → users without any group.
      - otherwise                     → only users in one of these linked groups.
    """

    __tablename__ = "app_setting_user_group_links"
    __table_args__ = (
        UniqueConstraint(
            "app_setting_id", "user_group_id",
            name="idx_uq_app_setting_user_group",
        ),
    )
    app_setting_id: Mapped[int] = mapped_column(
        ForeignKey("app_settings.id", ondelete="CASCADE"), nullable=False
    )
    user_group_id: Mapped[int] = mapped_column(
        ForeignKey("user_groups.id", ondelete="CASCADE"), nullable=False
    )

    app_setting: Mapped["AppSetting"] = relationship(
        back_populates="user_group_links", lazy="selectin"
    )
