from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin, TimestampMixin


class EducationDegree(IntIdPkMixin, TimestampMixin, Base):
    """Lookup of academic degrees (bachelor / specialist / master).

    name_key is a translation key resolved on the frontend via getString
    (UK+EN live in the DB strings) — same convention as review_levels.
    """

    __tablename__ = "education_degrees"

    name_key: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
