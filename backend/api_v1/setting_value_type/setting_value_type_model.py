from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.app_setting.app_setting_model import AppSetting


class SettingValueType(IntIdPkMixin, TimestampMixin, Base):
    """
    Catalog of value types an app setting can hold (boolean / integer / date /
    json). The `key` tells the reader how to cast the JSON `value` of a setting.
    """

    __tablename__ = "setting_value_types"

    key: Mapped[str] = mapped_column(String(16), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    settings: Mapped[list["AppSetting"]] = relationship(
        back_populates="value_type",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<SettingValueType(id={self.id}, key='{self.key}')>"
