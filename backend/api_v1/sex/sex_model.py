from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin

if TYPE_CHECKING:
    from backend.api_v1.person.person_model import Person

# Fixed ids, pinned by the migration seed (setval keeps the sequence in sync).
MALE_SEX_ID = 1
FEMALE_SEX_ID = 2
SEX_ID_BY_NAME: dict[str, int] = {"male": MALE_SEX_ID, "female": FEMALE_SEX_ID}


class Sex(IntIdPkMixin, TimestampMixin, Base):
    """Sex lookup: 1=male, 2=female. Referenced by persons.sex_id."""

    __tablename__ = "sexes"

    name: Mapped[str] = mapped_column(String(16), nullable=False, unique=True)

    persons: Mapped[list["Person"]] = relationship(back_populates="sex_ref")

    def __repr__(self) -> str:
        return f"<Sex(id={self.id}, name='{self.name}')>"
