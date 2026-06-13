from sqlalchemy import ForeignKey, String, LargeBinary, Integer
from sqlalchemy.orm import Mapped, mapped_column
from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin


class EmployeePhoto(IntIdPkMixin, TimestampMixin, Base):
    """A single profile photo for an employee (1:1), stored as a downscaled blob.

    Lives in its own table so the (potentially large) image bytes never load with
    a normal Employee query. The FK is ``ON DELETE CASCADE`` at the DB level — and
    there is intentionally NO ORM relationship on Employee — so the row is removed
    by Postgres when the employee is deleted, without dragging the blob into
    employee loads or risking the ORM nulling the FK.
    """

    __tablename__ = "employee_photos"

    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    # Normalised on upload to exactly "image/jpeg" or "image/png" (see service).
    content_type: Mapped[str] = mapped_column(String(20), nullable=False)
    data: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    size: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
