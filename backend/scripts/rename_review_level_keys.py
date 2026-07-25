"""One-off, idempotent rename of the people-review LEVEL/REQUIREMENT translation
keys from positional (``reviewLevelReq_l1_1``) to meaning-based slugs.

Why: a positional key like ``..._l1_1`` bakes the sort position into the key, so
reordering (now supported) makes the name lie — any requirement could become #1.
Meaning-based keys are stable under reorder.

Renames the msg key itself (``msg_keys.name``) so the SAME translation rows are
kept (a true rename, no orphans), then repoints every column that stores the key:
the live requirement/level rows AND the per-session FROZEN snapshot copies
(``review_session_level_requirements`` / ``review_session_levels``).

Level NAME keys (``reviewLevelName_base/_l1/_l2/_l3``) are left as-is: they are
rank identities ("Base level", "Level 1"), not reorderable positions.

Idempotent: each rename runs only when the old key still exists. Safe to re-run.

Run from the repo root:
    python backend/scripts/rename_review_level_keys.py
"""

import asyncio
import os
import sys

sys.path.insert(
    0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)

from backend.database.db_helper import db_helper
from sqlalchemy import text

# old positional key -> new meaning-based key (derived from the EN text).
RENAMES: dict[str, str] = {
    # Base level requirements
    "reviewLevelReq_base_1": "reviewLevelReq_learnsCompanyStandards",
    "reviewLevelReq_base_2": "reviewLevelReq_learningProfession",
    "reviewLevelReq_base_3": "reviewLevelReq_worksInNewPerimeter",
    "reviewLevelReq_base_4": "reviewLevelReq_needsKeyCompetences",
    "reviewLevelReq_base_5": "reviewLevelReq_roleNotFullyMatching",
    "reviewLevelReq_base_6": "reviewLevelReq_knowsCompanyValues",
    # Level 1 requirements
    "reviewLevelReq_l1_1": "reviewLevelReq_performsTasksIndependently",
    "reviewLevelReq_l1_2": "reviewLevelReq_knowsStrengthsAdapts",
    "reviewLevelReq_l1_3": "reviewLevelReq_explainsCompetencesWithFacts",
    "reviewLevelReq_l1_4": "reviewLevelReq_identifiesDevelopmentAreas",
    "reviewLevelReq_l1_5": "reviewLevelReq_achievesGoalsAndKpis",
    "reviewLevelReq_l1_6": "reviewLevelReq_hasTwoCompetences",
    # Level 2 requirements
    "reviewLevelReq_l2_1": "reviewLevelReq_mastersComplexTasks",
    "reviewLevelReq_l2_2": "reviewLevelReq_missionsBeyondProfession",
    "reviewLevelReq_l2_3": "reviewLevelReq_mentorsJuniorColleagues",
    "reviewLevelReq_l2_4": "reviewLevelReq_mastersAdjacentProfessions",
    "reviewLevelReq_l2_5": "reviewLevelReq_improvesDepartmentStandards",
    "reviewLevelReq_l2_6": "reviewLevelReq_hasThreeCompetences",
    # Level 3 requirements
    "reviewLevelReq_l3_1": "reviewLevelReq_appliesVisionForesight",
    "reviewLevelReq_l3_2": "reviewLevelReq_initiatesCrossProfessionMissions",
    "reviewLevelReq_l3_3": "reviewLevelReq_involvesColleaguesInDecisions",
    "reviewLevelReq_l3_4": "reviewLevelReq_proposesHolisticIdeas",
    "reviewLevelReq_l3_5": "reviewLevelReq_appliesCompanyStrategy",
    "reviewLevelReq_l3_6": "reviewLevelReq_hasFourCompetencesRoleModel",
    "reviewLevelReq_l3_7": "reviewLevelReq_activeInCompanyLife",
    "reviewLevelReq_l3_8": "reviewLevelReq_deliversTrainings",
    "reviewLevelReq_l3_9": "reviewLevelReq_positiveCrossDeptFeedback",
    # Level descriptions
    "reviewLevelDesc_base": "reviewLevelDesc_learningAndIntegrating",
    "reviewLevelDesc_l1": "reviewLevelDesc_autonomousInProfession",
    "reviewLevelDesc_l2": "reviewLevelDesc_improveExistingState",
    "reviewLevelDesc_l3": "reviewLevelDesc_inspireBeyondDirectorate",
}

# Every (table, column) that stores one of these keys, including the per-session
# frozen snapshot copies (so frozen sessions don't render raw old keys).
KEY_COLUMNS = [
    ("review_level_requirements", "text_key"),
    ("review_levels", "description_key"),
    ("review_session_level_requirements", "text_key"),
    ("review_session_levels", "description_key"),
]


async def main() -> None:
    renamed_keys = 0
    repointed = 0
    async with db_helper.session_factory() as session:
        for old, new in RENAMES.items():
            old_exists = await session.scalar(
                text("select 1 from msg_keys where name = :n"), {"n": old}
            )
            new_exists = await session.scalar(
                text("select 1 from msg_keys where name = :n"), {"n": new}
            )
            if old_exists and not new_exists:
                await session.execute(
                    text("update msg_keys set name = :new where name = :old"),
                    {"new": new, "old": old},
                )
                renamed_keys += 1

            for table, col in KEY_COLUMNS:
                res = await session.execute(
                    text(
                        f"update {table} set {col} = :new where {col} = :old"
                    ),
                    {"new": new, "old": old},
                )
                repointed += res.rowcount or 0

        await session.commit()

    await db_helper.dispose()
    print(f"rename done — keys renamed: {renamed_keys}, rows repointed: {repointed}")


if __name__ == "__main__":
    asyncio.run(main())
