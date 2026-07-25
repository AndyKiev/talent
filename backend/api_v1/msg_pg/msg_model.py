from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin

if TYPE_CHECKING:
    from backend.api_v1.lang.lang_model import Lang
    from backend.api_v1.msg_key.msg_key_model import MsgKey


class Msg(IntIdPkMixin, Base):
    value: Mapped[str] = mapped_column(Text, nullable=False)

    # foreign keys
    msg_key_id: Mapped[int] = mapped_column(ForeignKey("msg_keys.id"), nullable=False)
    lang_id: Mapped[int] = mapped_column(ForeignKey("langs.id"), nullable=False)

    # relationships
    msg_key: Mapped["MsgKey"] = relationship(back_populates="msg")
    lang_data: Mapped["Lang"] = relationship(back_populates="msg", lazy="selectin")

    __table_args__ = (
        UniqueConstraint("lang_id", "msg_key_id", name="uq_msg_key_lang"),
    )
