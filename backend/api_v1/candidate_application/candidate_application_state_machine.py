"""State machine for a candidate application's hiring pipeline.

The stage set is FIXED (rows seeded in pipeline_statuses by the migration); the
service matches rows by name against these keys and refuses any transition not
listed in ALLOWED_TRANSITIONS.

A card may move FORWARD to any later stage (skipping is allowed — applied → offer
is legal) or be REJECTED from any non-terminal stage. It can never move backward,
and hired / rejected are terminal.
"""

from enum import Enum


class PipelineStatusKey(str, Enum):
    APPLIED = "applied"
    SCREEN = "screen"
    INTERVIEW = "interview"
    OFFER = "offer"
    HIRED = "hired"
    REJECTED = "rejected"


# Forward progression line (rejected is a terminal side-exit, not on this line).
_PROGRESSION: list[PipelineStatusKey] = [
    PipelineStatusKey.APPLIED,
    PipelineStatusKey.SCREEN,
    PipelineStatusKey.INTERVIEW,
    PipelineStatusKey.OFFER,
    PipelineStatusKey.HIRED,
]

TERMINAL_STATUS_KEYS = frozenset(
    {PipelineStatusKey.HIRED, PipelineStatusKey.REJECTED}
)


def _build_transitions() -> dict[PipelineStatusKey, frozenset[PipelineStatusKey]]:
    table: dict[PipelineStatusKey, frozenset[PipelineStatusKey]] = {}
    for i, key in enumerate(_PROGRESSION):
        if key in TERMINAL_STATUS_KEYS:
            table[key] = frozenset()
        else:
            # Any later stage on the progression line, plus rejection.
            table[key] = frozenset(
                set(_PROGRESSION[i + 1:]) | {PipelineStatusKey.REJECTED}
            )
    table[PipelineStatusKey.REJECTED] = frozenset()
    return table


ALLOWED_TRANSITIONS = _build_transitions()


def can_transition(
    current: PipelineStatusKey, target: PipelineStatusKey
) -> bool:
    return target in ALLOWED_TRANSITIONS.get(current, frozenset())
