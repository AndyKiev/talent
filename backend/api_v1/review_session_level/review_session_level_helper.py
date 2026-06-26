"""Shared resolver for a session's FROZEN competency-level set.

Returns levels in the LIVE-id shape (`id` = source live id) so all existing
save/match/gate logic keeps working in live-id space. Falls back to the live
active levels when the session has no snapshot (sessions opened before the
freeze), mirroring how the criteria read path falls back to the live hint.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.review_level.review_level_model import ReviewLevel
from backend.api_v1.review_session_level.review_session_level_model import (
    ReviewSessionLevel,
)
from backend.api_v1.review_session_level.review_session_level_schema import (
    SessionLevelSchema,
    SessionLevelRequirementSchema,
)


async def frozen_levels_for_session(
    session: AsyncSession, session_id: int
) -> list[SessionLevelSchema]:
    frozen = (
        (
            await session.execute(
                select(ReviewSessionLevel)
                .where(ReviewSessionLevel.session_id == session_id)
                .order_by(ReviewSessionLevel.sort_order, ReviewSessionLevel.id)
            )
        )
        .scalars()
        .all()
    )
    if frozen:
        out: list[SessionLevelSchema] = []
        for sl in frozen:
            # source deleted -> no live id to select/save against; skip it.
            if sl.source_level_id is None:
                continue
            reqs = sorted(sl.requirements, key=lambda r: (r.sort_order, r.id))
            out.append(
                SessionLevelSchema(
                    id=sl.source_level_id,
                    name_key=sl.name_key,
                    description_key=sl.description_key,
                    sort_order=sl.sort_order,
                    requirements=[
                        SessionLevelRequirementSchema(
                            id=r.source_requirement_id,
                            text_key=r.text_key,
                            sort_order=r.sort_order,
                        )
                        for r in reqs
                        if r.source_requirement_id is not None
                    ],
                )
            )
        return out

    # Fallback: live active levels (pre-freeze sessions).
    live = (
        (
            await session.execute(
                select(ReviewLevel)
                .where(ReviewLevel.is_active == True)
                .order_by(ReviewLevel.sort_order, ReviewLevel.id)
            )
        )
        .scalars()
        .all()
    )
    return [
        SessionLevelSchema(
            id=lvl.id,
            name_key=lvl.name_key,
            description_key=lvl.description_key,
            sort_order=lvl.sort_order,
            requirements=[
                SessionLevelRequirementSchema(
                    id=r.id, text_key=r.text_key, sort_order=r.sort_order
                )
                for r in sorted(lvl.requirements, key=lambda r: (r.sort_order, r.id))
                if r.is_active
            ],
        )
        for lvl in live
    ]
