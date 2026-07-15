"""State machine for recruitment task statuses.

The status set is FIXED (rows seeded in recruitment_task_statuses by the
migration); the service matches rows by name against these keys and refuses
any transition not listed in ALLOWED_TRANSITIONS.
"""

from enum import Enum


class RecruitmentTaskStatusKey(str, Enum):
    CREATED = "created"
    IN_PROCESS = "in_process"
    FULFILLED = "fulfilled"
    REJECTED = "rejected"


# fulfilled / rejected are terminal — a closed task never reopens.
CLOSED_STATUS_KEYS = frozenset(
    {RecruitmentTaskStatusKey.FULFILLED, RecruitmentTaskStatusKey.REJECTED}
)

ALLOWED_TRANSITIONS: dict[
    RecruitmentTaskStatusKey, frozenset[RecruitmentTaskStatusKey]
] = {
    # A created task may be cancelled without ever going to work.
    RecruitmentTaskStatusKey.CREATED: frozenset(
        {RecruitmentTaskStatusKey.IN_PROCESS, RecruitmentTaskStatusKey.REJECTED}
    ),
    RecruitmentTaskStatusKey.IN_PROCESS: frozenset(
        {RecruitmentTaskStatusKey.FULFILLED, RecruitmentTaskStatusKey.REJECTED}
    ),
    RecruitmentTaskStatusKey.FULFILLED: frozenset(),
    RecruitmentTaskStatusKey.REJECTED: frozenset(),
}


def can_transition(
    current: RecruitmentTaskStatusKey, target: RecruitmentTaskStatusKey
) -> bool:
    return target in ALLOWED_TRANSITIONS.get(current, frozenset())
