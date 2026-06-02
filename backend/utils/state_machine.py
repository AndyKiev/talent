"""
state_machine.py — Lightweight Generic State Machine
====================================================
A type-safe, zero-dependency state machine for Python 3.10+.

Usage (decorator style):
    sm = StateMachine()

    @sm.transition(StateA, Event.X, StateB)
    def handle_x(ctx): ...

Usage (explicit registration):
    sm.add_transition(StateA, Event.X, StateB, handle_x)

Multi-source states (decorator style):
    @sm.transition((StateA, StateB), Event.X, StateC)
    def handle_x(ctx): ...

Firing an event:
    new_state = sm.handle(ctx, current_state, event)

Raises InvalidTransitionError on undefined (state, event) pairs.
"""
from typing import Callable, Generic, Hashable, TypeVar, Union

StateT = TypeVar("StateT", bound=Hashable)
EventT = TypeVar("EventT", bound=Hashable)
CtxT = TypeVar("CtxT")

Action = Callable[[CtxT], None]


class InvalidTransitionError(Exception):
    """Raised when no transition is defined for a (state, event) pair."""

    def __init__(self, state: Hashable, event: Hashable) -> None:
        super().__init__(f"No transition from state={state!r} on event={event!r}")
        self.state = state
        self.event = event


class StateMachine(Generic[StateT, EventT, CtxT]):
    """
    Generic state machine parameterised on state type, event type, and context type.

    The machine is *stateless* itself — it holds only the transition table.
    State lives in the caller (e.g. a domain object or a dataclass field).
    """

    def __init__(self) -> None:
        # { (from_state, event): (to_state, action) }
        self._table: dict[
            tuple[StateT, EventT], tuple[StateT, Action[CtxT] | None]
        ] = {}

    # ------------------------------------------------------------------
    # Registration helpers
    # ------------------------------------------------------------------
    def add_transition(
        self,
        from_state: StateT,
        event: EventT,
        to_state: StateT,
        action: Action[CtxT] | None = None,
    ) -> None:
        """Register a single (from_state, event) → to_state transition."""
        key = (from_state, event)
        if key in self._table:
            raise ValueError(
                f"Transition already registered for state={from_state!r}, event={event!r}"
            )
        self._table[key] = (to_state, action)

    def transition(
        self,
        from_state: Union[StateT, tuple[StateT, ...]],
        event: EventT,
        to_state: StateT,
    ) -> Callable[[Action[CtxT]], Action[CtxT]]:
        """
        Decorator that registers the decorated function as the transition action.

        Accepts a single from_state or a tuple of from_states that all share the
        same event → to_state mapping (but the same action function).
        """
        sources = from_state if isinstance(from_state, tuple) else (from_state,)

        def decorator(fn: Action[CtxT]) -> Action[CtxT]:
            for src in sources:
                self.add_transition(src, event, to_state, fn)
            return fn

        return decorator

    # ------------------------------------------------------------------
    # Runtime
    # ------------------------------------------------------------------
    def handle(self, ctx: CtxT, current_state: StateT, event: EventT) -> StateT:
        """
        Process *event* given *current_state*, mutate *ctx* via the registered
        action, and return the new state.

        Raises:
            InvalidTransitionError: if no transition is defined.
        """
        key = (current_state, event)
        if key not in self._table:
            raise InvalidTransitionError(current_state, event)
        to_state, action = self._table[key]
        if action is not None:
            action(ctx)
        return to_state

    # ------------------------------------------------------------------
    # Introspection
    # ------------------------------------------------------------------
    def transitions(self) -> list[tuple[StateT, EventT, StateT]]:
        """Return all registered transitions as (from, event, to) triples."""
        return [(src, ev, dst) for (src, ev), (dst, _) in self._table.items()]

    def can_handle(self, state: StateT, event: EventT) -> bool:
        """Return True if the given (state, event) pair has a registered transition."""
        return (state, event) in self._table
