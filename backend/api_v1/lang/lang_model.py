from typing import TYPE_CHECKING

from sqlalchemy import (
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models.utils.mixins import IntIdPkMixin

if TYPE_CHECKING:
    from backend.api_v1.employee.employee_model import Employee
    from backend.api_v1.msg_pg.msg_model import Msg


# Add this relationship to the Lang class
class Lang(IntIdPkMixin, Base):
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    short_name: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)
    # relationship
    msg: Mapped[list["Msg"]] = relationship(back_populates="lang_data")
    employees: Mapped[list["Employee"]] = relationship(back_populates="lang")
