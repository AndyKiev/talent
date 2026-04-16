from typing import List, TYPE_CHECKING

from sqlalchemy import (
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.database.mixins import IntIdPkMixin
from backend.api_v1.lang.lang_model import Lang

# backend/api_v1/models/message_model.py

if TYPE_CHECKING:
    from backend.api_v1.user.user_model import User
    from backend.api_v1.lang.lang_model import Lang

class MsgKey(IntIdPkMixin, Base):
    # __tablename__ = "msgkeys"
    key_name: Mapped[str] = mapped_column(String(256), nullable=False, unique=True)

    # relationship
    msg: Mapped[List["Msg"]] = relationship(
        back_populates="msg_key", lazy="selectin", cascade="all, delete-orphan"
    )




class Msg(IntIdPkMixin, Base):
    __tablename__ = "msg"
    value: Mapped[str] = mapped_column(Text, nullable=False)   

    # foreign key
    msg_key_id: Mapped[int] = mapped_column(ForeignKey("msg_keys.id"), nullable=True)
    lang_id: Mapped[int] = mapped_column(ForeignKey("langs.id"), nullable=True)

    # relationship
    msg_key: Mapped[MsgKey] = relationship(back_populates="msg")
    lang_data: Mapped[Lang] = relationship(back_populates="msg", lazy="selectin")

    __table_args__ = (UniqueConstraint(lang_id, msg_key_id, name="uq_msg_key_lang"),)
