from datetime import date

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin
from backend.utils.crypto.types import EncryptedDate


class EmployeeChild(IntIdPkMixin, TimestampMixin, Base):
    """One child of a PERSON (1:N). Lives in its own table. We store only the
    birth date (no name) — the UI derives the count of children aged <= 14 from
    these birth dates. The HTTP API still speaks employee_id; the service
    resolves it to person_id. Children die with the person (ON DELETE CASCADE)."""

    __tablename__ = "employee_children"

    person_id: Mapped[int] = mapped_column(
        ForeignKey("persons.id", ondelete="CASCADE"), nullable=False
    )
    # ENCRYPTED AT REST (see backend/utils/crypto/registry.py). A child's date
    # of birth is personal data about a third party who is not even an employee.
    birth_date: Mapped[date] = mapped_column(EncryptedDate, nullable=False)
