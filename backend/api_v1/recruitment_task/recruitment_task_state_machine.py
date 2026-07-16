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

# Transitions are REVERSIBLE — a closed task can be reopened, and a task in work
# can be sent back to created. The service clears the in_process_at / closed_at
# stamps when a transition moves the task back out of those states.
ALLOWED_TRANSITIONS: dict[
    RecruitmentTaskStatusKey, frozenset[RecruitmentTaskStatusKey]
] = {
    # A created task may go to work or be cancelled outright.
    RecruitmentTaskStatusKey.CREATED: frozenset(
        {RecruitmentTaskStatusKey.IN_PROCESS, RecruitmentTaskStatusKey.REJECTED}
    ),
    # In work: close it (fulfilled/rejected) or send it back to created.
    RecruitmentTaskStatusKey.IN_PROCESS: frozenset(
        {
            RecruitmentTaskStatusKey.CREATED,
            RecruitmentTaskStatusKey.FULFILLED,
            RecruitmentTaskStatusKey.REJECTED,
        }
    ),
    # Reopen a fulfilled task back into work.
    RecruitmentTaskStatusKey.FULFILLED: frozenset(
        {RecruitmentTaskStatusKey.IN_PROCESS}
    ),
    # Reopen a rejected task into work or back to created.
    RecruitmentTaskStatusKey.REJECTED: frozenset(
        {RecruitmentTaskStatusKey.CREATED, RecruitmentTaskStatusKey.IN_PROCESS}
    ),
}


def can_transition(
    current: RecruitmentTaskStatusKey, target: RecruitmentTaskStatusKey
) -> bool:
    return target in ALLOWED_TRANSITIONS.get(current, frozenset())
