"""Idempotent backfill of frozen criteria for sessions opened before freezing.

Reviews now score the criteria FROZEN into a session at open time
(``review_session_criterions``). Sessions opened before that feature existed have
no frozen rows, so their behaviour descriptors were rendered by parsing each
dimension's ``description`` (the •-bulleted "hint"). This script reproduces those
exact descriptors and stores them as frozen criteria, so historical sessions are
tracked in the same table as new ones — WITHOUT shifting any existing
position-based scores (the descriptor order/count is preserved).

Why ``description`` and not the live criteria table: the per-descriptor scores
are kept by position (``criterion_index``) against what the review showed, which
was the description-hint — NOT the criteria rows (those didn't drive reviews
yet). Freezing today's criteria onto an old session could change the descriptor
count and silently remap its scores; freezing the hint cannot.

``source_criteria_id`` is left NULL — these came from the hint, not a criterion.

Idempotent: a (session, dimension) that already has any frozen criterion is
skipped. The frontend also falls back to parsing the hint when a session has no
frozen criteria, so running this is about explicit tracking, not correctness.

Run from the repo root after the migration is applied:
    poetry run python -m backend.scripts.backfill_session_criteria
or simply:
    python backend/scripts/backfill_session_criteria.py
"""

import asyncio
import os
import re
import sys

# Make the repo root importable so `backend...` resolves regardless of CWD.
sys.path.insert(
    0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)

from backend.api_v1.review_dimension.review_dimension_model import (
    ReviewDimension,
)
from backend.api_v1.review_session.review_session_model import ReviewSession
from backend.api_v1.review_session_criterion.review_session_criterion_model import (
    ReviewSessionCriterion,
)
from backend.api_v1.review_session_employee.review_session_employee_model import (
    ReviewSessionEmployee,
)
from backend.api_v1.review_session_employee_evaluation.review_session_employee_evaluation_model import (
    ReviewSessionEmployeeEvaluation,
)
from backend.database.db_helper import db_helper
from sqlalchemy import select

_BULLET = re.compile(r"^\s*[•\-*]\s*")
_NUMBER = re.compile(r"^\s*\d+[.)]\s*")


def parse_descriptors(hint: str | None) -> list[str]:
    """Split a •-bulleted, newline-joined hint into descriptors — must mirror the
    frontend ``parseDescriptors`` exactly so the index→descriptor mapping matches."""
    if not hint:
        return []
    out: list[str] = []
    for line in hint.split("\n"):
        line = _BULLET.sub("", line)
        line = _NUMBER.sub("", line)
        line = line.strip()
        if line:
            out.append(line)
    return out


async def main() -> None:
    created = 0
    sessions_touched = 0
    async with db_helper.session_factory() as session:
        dimensions = {
            d.id: d
            for d in (await session.execute(select(ReviewDimension))).scalars().all()
        }
        review_sessions = (
            (await session.execute(select(ReviewSession))).scalars().all()
        )

        for rs in review_sessions:
            # (session, dimension) pairs that already carry a frozen snapshot.
            already = set(
                (
                    await session.execute(
                        select(ReviewSessionCriterion.dimension_id).where(
                            ReviewSessionCriterion.session_id == rs.id
                        )
                    )
                )
                .scalars()
                .all()
            )

            # The exact set of dimensions this session was generated against =
            # the distinct dimensions of its evaluations.
            dim_ids = (
                (
                    await session.execute(
                        select(ReviewSessionEmployeeEvaluation.dimension_id)
                        .join(
                            ReviewSessionEmployee,
                            ReviewSessionEmployee.id
                            == ReviewSessionEmployeeEvaluation.review_session_employee_id,
                        )
                        .where(ReviewSessionEmployee.session_id == rs.id)
                        .distinct()
                    )
                )
                .scalars()
                .all()
            )

            touched = False
            for dim_id in dim_ids:
                if dim_id in already:
                    continue
                dim = dimensions.get(dim_id)
                if dim is None:
                    continue
                descriptors = parse_descriptors(dim.description)
                for idx, text in enumerate(descriptors):
                    session.add(
                        ReviewSessionCriterion(
                            session_id=rs.id,
                            dimension_id=dim_id,
                            source_criteria_id=None,
                            text=text,
                            sort_order=idx,
                        )
                    )
                    created += 1
                    touched = True
            if touched:
                sessions_touched += 1

        await session.commit()

    print(
        f"Backfill complete: {created} frozen criteria across "
        f"{sessions_touched} session(s)."
    )


if __name__ == "__main__":
    asyncio.run(main())
