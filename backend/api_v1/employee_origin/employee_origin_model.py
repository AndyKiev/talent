from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.employee.employee_model import Employee

# Fixed ids, pinned by the migration seed (setval keeps the sequence in sync).
HUMAN_ORIGIN_ID = 1
ROBOT_ORIGIN_ID = 2


class EmployeeOrigin(IntIdPkMixin, TimestampMixin, Base):
    """Employee origin lookup: 1=human, 2=robot (system accounts like ADMIN).

    Robots are excluded from people-review enrollment and act as the attributed
    actor for scheduled scripts (see backend/utils/system_actor.py).
    """

    __tablename__ = "employee_origins"

    name: Mapped[str] = mapped_column(String(16), nullable=False, unique=True)

    employees: Mapped[list["Employee"]] = relationship(back_populates="origin")

    def __repr__(self) -> str:
        return f"<EmployeeOrigin(id={self.id}, name='{self.name}')>"
