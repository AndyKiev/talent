from datetime import datetime
from sqlalchemy import DateTime, Integer
from sqlalchemy.sql import func

# from sqlalchemy import Sequence
from sqlalchemy.orm import Mapped, declared_attr, mapped_column


# class IntIdPkMixin:
#     id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)


class IntIdPkMixin:
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)


# class IntIdPkMixin:
#     @declared_attr
#     def id(cls) -> Mapped[int]:
#         seq = Sequence(f"{cls.__tablename__}_seq", start=1, increment=1)
#         return mapped_column(
#             Integer,
#             seq,                        # <-- pass Sequence as positional arg
#             primary_key=True,
#             autoincrement=False,
#             server_default=seq.next_value(),
#         )


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
