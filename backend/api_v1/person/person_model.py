from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint, event
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin
from backend.utils.crypto.blind_index import name_blind_index
from backend.utils.crypto.types import EncryptedDate, EncryptedString

if TYPE_CHECKING:
    from backend.api_v1.employee.employee_model import Employee
    from backend.api_v1.marital_status.marital_status_model import MaritalStatus
    from backend.api_v1.sex.sex_model import Sex


class Person(IntIdPkMixin, TimestampMixin, Base):
    """Physical person behind one or more employee records.

    name_dedupe_no keeps (last_name, first_name) unique for the rare real
    namesakes: the first person gets 0, the next 1, and so on.
    """

    __tablename__ = "persons"
    __table_args__ = (
        # Uniqueness moved off (last_name, first_name) onto the blind index when
        # the name columns were encrypted: randomized ciphertext differs for
        # every row, so a constraint over it would never fire again. name_hash
        # is deterministic, so this enforces exactly the old rule.
        UniqueConstraint(
            "name_hash",
            "name_dedupe_no",
            name="uq_persons_name_hash_dedupe",
        ),
    )

    # ENCRYPTED AT REST (see backend/utils/crypto/registry.py). Nothing in SQL
    # may compare, sort or search these — use name_hash for equality.
    first_name: Mapped[str] = mapped_column(EncryptedString, nullable=False)
    last_name: Mapped[str] = mapped_column(EncryptedString, nullable=False)
    patronymic: Mapped[str | None] = mapped_column(EncryptedString, nullable=True)
    # Deterministic HMAC of (last_name, first_name) — the ONLY way to look a
    # person up by name now. Maintained by the mapper event at the bottom of
    # this file, never by hand: a writer that forgot it would silently break
    # namesake detection rather than fail.
    name_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    # Sex lookup (1=male, 2=female). API keeps exchanging the 'male'/'female'
    # string via the `sex` property below.
    sex_id: Mapped[int | None] = mapped_column(
        ForeignKey("sexes.id"), nullable=True, default=None
    )
    # Marital-status lookup (1=married, 2=not_married). API exchanges the
    # 'married'/'not_married' string via the `marital_status` property below.
    marital_status_id: Mapped[int | None] = mapped_column(
        ForeignKey("marital_statuses.id"), nullable=True, default=None
    )
    # ENCRYPTED AT REST (see backend/utils/crypto/registry.py). Stored as
    # encrypted ISO text, so it is a `date` in Python and opaque in SQL —
    # nothing may sort or range-filter it in the database.
    birth_date: Mapped[date | None] = mapped_column(EncryptedDate, nullable=True)
    name_dedupe_no: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )

    employees: Mapped[list["Employee"]] = relationship(
        back_populates="person",
        lazy="selectin",
    )

    sex_ref: Mapped["Sex | None"] = relationship(
        back_populates="persons",
        lazy="selectin",
    )

    marital_status_ref: Mapped["MaritalStatus | None"] = relationship(
        back_populates="persons",
        lazy="selectin",
    )

    @property
    def sex(self) -> str | None:
        # Read-only 'male' / 'female' mirror of the sex lookup — keeps the API
        # and Pydantic schemas string-based while the DB stores sex_id.
        return self.sex_ref.name if self.sex_ref else None

    @property
    def marital_status(self) -> str | None:
        # Read-only 'married' / 'not_married' mirror of the lookup.
        return self.marital_status_ref.name if self.marital_status_ref else None

    def __repr__(self) -> str:
        return (
            f"<Person(id={self.id}, last_name='{self.last_name}', "
            f"first_name='{self.first_name}', dedupe={self.name_dedupe_no})>"
        )


# The blind index is derived state, so it is maintained HERE rather than by each
# caller. Person names are written from many places — the admin CRUD, employee
# registration with activation, self-registration, seeds, and the surname-change
# person event — and a single one of them forgetting to recompute the hash would
# not raise: it would just stop finding that person by name, and let a duplicate
# through the unique constraint. A mapper event cannot be forgotten.
@event.listens_for(Person, "before_insert")
@event.listens_for(Person, "before_update")
def _sync_name_hash(mapper, connection, target: "Person") -> None:
    target.name_hash = name_blind_index(target.first_name, target.last_name)
