"""
employee_status_transitions.py
==============================
Declares the legal employee-status transitions as a state machine, where the
"event" fired is the *target status name* (per the agreed design:
"target status is the event identity").

Status names (from employee_statuses table):
    working, maternity, coscription, dismissed

Legal transitions:
    working      --[maternity]--->   maternity     (TEMPORARY_LEAVE)
    working      --[coscription]-->  coscription   (TEMPORARY_LEAVE)
    maternity    --[working]----->   working       (RETURN)
    coscription  --[working]----->   working       (RETURN)
    working      --[dismissed]---->  dismissed     (DISMISSAL)

ACTIVATION is intentionally NOT routed through this machine — it is the
genesis event that sets the initial status directly (Model A). See
`resolve_status_transition` / `ACTIVATION_TARGET`.

This module exposes a PURE function `resolve_status_transition(current, target)`
that returns the resulting status name or raises InvalidStatusTransition.
Both today's one-shot apply (Model A) and a future replay engine (Model B)
call this same function — no behavioural drift between them.
"""
from dataclasses import dataclass, field
from typing import List

from backend.utils.state_machine import StateMachine, InvalidTransitionError


# ── Canonical status names (kept as constants to avoid magic strings) ──────────
STATUS_WORKING = "working"
STATUS_MATERNITY = "maternity"
STATUS_COSCRIPTION = "coscription"
STATUS_DISMISSED = "dismissed"

# Status that activation establishes (genesis).
ACTIVATION_TARGET = STATUS_WORKING


@dataclass
class StatusTransitionCtx:
    """Context passed through the SM — currently just an audit trail."""
    employee_id: int | None = None
    audit: List[str] = field(default_factory=list)


# State = status name (str); Event = target status name (str); Ctx = StatusTransitionCtx
status_sm: StateMachine[str, str, StatusTransitionCtx] = StateMachine()


@status_sm.transition(STATUS_WORKING, STATUS_MATERNITY, STATUS_MATERNITY)
def _to_maternity(ctx: StatusTransitionCtx) -> None:
    ctx.audit.append("working -> maternity")


@status_sm.transition(STATUS_WORKING, STATUS_COSCRIPTION, STATUS_COSCRIPTION)
def _to_coscription(ctx: StatusTransitionCtx) -> None:
    ctx.audit.append("working -> coscription")


@status_sm.transition(
    (STATUS_MATERNITY, STATUS_COSCRIPTION), STATUS_WORKING, STATUS_WORKING
)
def _return_to_working(ctx: StatusTransitionCtx) -> None:
    ctx.audit.append("leave -> working")


@status_sm.transition(STATUS_WORKING, STATUS_DISMISSED, STATUS_DISMISSED)
def _to_dismissed(ctx: StatusTransitionCtx) -> None:
    ctx.audit.append("working -> dismissed")


class InvalidStatusTransition(Exception):
    """Domain-level wrapper around the SM's InvalidTransitionError."""

    def __init__(self, current: str, target: str) -> None:
        super().__init__(
            f"Illegal employee status transition: {current!r} -> {target!r}"
        )
        self.current = current
        self.target = target


def resolve_status_transition(
    current_status_name: str,
    target_status_name: str,
    employee_id: int | None = None,
) -> str:
    """
    Pure transition resolver. Returns the resulting status name, or raises
    InvalidStatusTransition if the (current -> target) move is not allowed.

    Used by apply-now (Model A) and, later, the replay engine (Model B).
    Activation is handled by the caller (sets ACTIVATION_TARGET directly),
    so it never reaches this function.
    """
    ctx = StatusTransitionCtx(employee_id=employee_id)
    try:
        return status_sm.handle(ctx, current_status_name, target_status_name)
    except InvalidTransitionError as exc:
        raise InvalidStatusTransition(current_status_name, target_status_name) from exc


def allowed_targets(current_status_name: str) -> list[str]:
    """
    Return the list of target status names reachable from the current status.
    Useful for the drawer to show only legal status options (UX convenience;
    the backend still enforces via resolve_status_transition).
    """
    return [
        dst
        for (src, _ev), dst in (
            ((s, e), d) for (s, e, d) in status_sm.transitions()
        )
        if src == current_status_name
    ]
