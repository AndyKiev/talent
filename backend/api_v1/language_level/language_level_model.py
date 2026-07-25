from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.api_v1.base.base_model import Base
from backend.api_v1.base.models import IntIdPkMixin


class LanguageLevel(IntIdPkMixin, Base):
    """CEFR proficiency level (A1..C2) the employee picks from a select.

    `hint` holds the can-do description shown when the level is selected.
    """

    __tablename__ = "language_levels"

    code: Mapped[str] = mapped_column(String(8), nullable=False, unique=True)
    label: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    hint: Mapped[str] = mapped_column(Text, nullable=False, default="")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
