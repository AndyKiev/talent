from typing import List, TYPE_CHECKING
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.api_v1.base.base_model import Base
from backend.database.mixins import IntIdPkMixin


if TYPE_CHECKING:
    from backend.api_v1.user.user_model import User
    from backend.api_v1.message.message_model import Msg


class Lang(IntIdPkMixin, Base):
    __tablename__ = "langs"

    name: Mapped[str]
    short_name: Mapped[str]
    msg: Mapped[List["Msg"]] = relationship(back_populates="lang_data")
    users: Mapped[List["User"]] = relationship(back_populates="lang")  # NEW



    
# class Lang(IntIdPkMixin, Base):
#     name: Mapped[str] = mapped_column(String(128), nullable=False)
#     short_name: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)

#     # relationship
#     msg: Mapped[List["Msg"]] = relationship(back_populates="lang_data")
#     users: Mapped[List["User"]] = relationship(back_populates="lang")  # NEW