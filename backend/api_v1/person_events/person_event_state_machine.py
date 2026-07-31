"""
person_event_state_machine.py
=============================
Legal moves for a person_events row's own lifecycle, on the generic engine in
`backend/utils/state_machine.py` (its second adopter — the four other
lifecycles in the app still carry hand-rolled dicts).

Same "target status is the event identity" trick as
`employee_status_transitions`: a person event has no separate event vocabulary,
so State and Event are both the status name.

    draft    --[ready]---->   ready      (author says it is complete)
    ready    --[applied]-->   applied    (scheduler, on/after effective_date)
    ready    --[draft]---->   draft      (author reopens it)
    applied  --[ready]---->   ready      (revert — see below)

Reverting an APPLIED event only un-marks the row; it does NOT put the old value
back. Undoing a surname change is itself a change of surname, and recording it
as one keeps the history honest about what was true when.

Note the asymmetry with the employee-event machine, which is a REVERSE-only
table because its forward moves belong to the scheduler. Here both directions
live in one table because the author drives draft<->ready themselves.
"""

from dataclasses import dataclass, field

from backend.api_v1.person_events.person_event_status.person_event_status_model import (
    STATUS_APPLIED,
    STATUS_DRAFT,
    STATUS_READY,
)
from backend.utils.state_machine import InvalidTransitionError, StateMachine


@dataclass
class PersonEventTransitionCtx:
    """Context threaded through the SM — currently just an audit trail."""

    event_id: int | None = None
    audit: list[str] = field(default_factory=list)


# State = status name (str); Event = target status name (str).
person_event_sm: StateMachine[str, str, PersonEventTransitionCtx] = StateMachine()


@person_event_sm.transition(STATUS_DRAFT, STATUS_READY, STATUS_READY)
def _to_ready(ctx: PersonEventTransitionCtx) -> None:
    ctx.audit.append("draft -> ready")


@person_event_sm.transition(STATUS_READY, STATUS_DRAFT, STATUS_DRAFT)
def _back_to_draft(ctx: PersonEventTransitionCtx) -> None:
    ctx.audit.append("ready -> draft")


@person_event_sm.transition(STATUS_READY, STATUS_APPLIED, STATUS_APPLIED)
def _to_applied(ctx: PersonEventTransitionCtx) -> None:
    ctx.audit.append("ready -> applied")


@person_event_sm.transition(STATUS_APPLIED, STATUS_READY, STATUS_READY)
def _revert_to_ready(ctx: PersonEventTransitionCtx) -> None:
    ctx.audit.append("applied -> ready (revert)")


class InvalidPersonEventTransition(Exception):
    """Domain-level wrapper around the SM's InvalidTransitionError."""

    def __init__(self, current: str, target: str) -> None:
        super().__init__(f"Illegal person event transition: {current!r} -> {target!r}")
        self.current = current
        self.target = target


def resolve_person_event_transition(
    current_status_name: str,
    target_status_name: str,
    event_id: int | None = None,
) -> str:
    """Pure resolver: returns the resulting status name or raises.

    Pure on purpose — the API path and the scheduler sweep both call this, so
    the two can never disagree about what is legal.
    """
    ctx = PersonEventTransitionCtx(event_id=event_id)
    try:
        return person_event_sm.handle(ctx, current_status_name, target_status_name)
    except InvalidTransitionError as exc:
        raise InvalidPersonEventTransition(
            current_status_name, target_status_name
        ) from exc


def allowed_targets(current_status_name: str) -> list[str]:
    """Statuses reachable from the current one — feeds the UI's status chips.
    The backend still enforces via resolve_person_event_transition."""
    return [
        dst
        for (src, _ev, dst) in person_event_sm.transitions()
        if src == current_status_name
    ]
