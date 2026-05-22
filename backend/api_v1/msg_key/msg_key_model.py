from typing import List, TYPE_CHECKING

from sqlalchemy import (
    # ForeignKey,
    String,
    # Text,
    # UniqueConstraint,
)
# from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin


# backend/api_v1/models/message_model.py

if TYPE_CHECKING:
    from backend.api_v1.msg_pg.msg_model import Msg

class MsgKey(IntIdPkMixin, Base):
    name: Mapped[str] = mapped_column(String(256), nullable=False, unique=True)
    # relationship
    msg: Mapped[List["Msg"]] = relationship(
        back_populates="msg_key", lazy="selectin", cascade="all, delete-orphan"
    )