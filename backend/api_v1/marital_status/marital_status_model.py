from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.person.person_model import Person

# Fixed ids, pinned by the migration seed (setval keeps the sequence in sync).
MARRIED_ID = 1
NOT_MARRIED_ID = 2
MARITAL_STATUS_ID_BY_NAME: dict[str, int] = {
    "married": MARRIED_ID,
    "not_married": NOT_MARRIED_ID,
}


class MaritalStatus(IntIdPkMixin, TimestampMixin, Base):
    """Marital-status lookup: 1=married, 2=not_married.

    Referenced by persons.marital_status_id. The stored name is the stable key;
    the frontend renders it sex-dependently (Одружений/Заміжня) via its own
    translation keys, so no per-sex variants live here.
    """

    __tablename__ = "marital_statuses"

    name: Mapped[str] = mapped_column(String(16), nullable=False, unique=True)

    persons: Mapped[list["Person"]] = relationship(back_populates="marital_status_ref")

    def __repr__(self) -> str:
        return f"<MaritalStatus(id={self.id}, name='{self.name}')>"
