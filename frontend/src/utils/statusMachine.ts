// src/utils/statusMachine.ts
//
// Generic, typed finite-state-machine helper for the app's status lifecycles
// (recruitment tasks, candidate pipeline, review-session employees, employee
// events, ...). One declarative config per feature answers every UI question —
// "which moves are legal", "what color/label is this status", "what does the
// transition button say" — so the rules live in exactly one place and always
// mirror the backend state machine.
//
// The machine deliberately does NOT execute side effects (dialogs, mutations):
// consumers keep those; the machine only answers what is legal / how it renders.
import type { GetStringFn } from '../types/getStringFn';

export type StatusChipColor =
    | 'default'
    | 'primary'
    | 'secondary'
    | 'info'
    | 'success'
    | 'warning'
    | 'error';

export type StatusButtonColor =
    | 'inherit'
    | 'primary'
    | 'secondary'
    | 'info'
    | 'success'
    | 'warning'
    | 'error';

export interface StatusMeta {
    /** Chip color the status renders with. */
    color: StatusChipColor;
    /** Translation key of the status label (+ hardcoded fallback). */
    labelKey: string;
    labelFallback: string;
    /** Label of the button that transitions INTO this status (optional —
     *  features whose transitions are icon-only can omit these). */
    transitionLabelKey?: string;
    transitionLabelFallback?: string;
    /** Color of the button that transitions INTO this status. */
    transitionColor?: StatusButtonColor;
}

export interface StatusMachineConfig<S extends string> {
    /** Allowed target statuses per current status — MUST mirror the backend. */
    transitions: Record<S, readonly S[]>;
    meta: Record<S, StatusMeta>;
}

export interface StatusMachine<S extends string> {
    /** All statuses, in config declaration order. */
    statuses: readonly S[];
    /** Statuses a record may legally move TO from `from` (terminal = []). */
    nextStatuses: (from: S) => readonly S[];
    canMove: (from: S, to: S) => boolean;
    isTerminal: (s: S) => boolean;
    color: (s: S) => StatusChipColor;
    label: (s: S, getString: GetStringFn) => string;
    /** Label/color for the button that transitions INTO the given status. */
    transitionLabel: (to: S, getString: GetStringFn) => string;
    transitionColor: (to: S) => StatusButtonColor;
}

export function defineStatusMachine<S extends string>(
    config: StatusMachineConfig<S>,
): StatusMachine<S> {
    const { transitions, meta } = config;
    return {
        statuses: Object.keys(transitions) as S[],
        nextStatuses: (from) => transitions[from] ?? [],
        canMove: (from, to) => (transitions[from] ?? []).includes(to),
        isTerminal: (s) => (transitions[s] ?? []).length === 0,
        color: (s) => meta[s]?.color ?? 'default',
        label: (s, getString) => getString(meta[s]?.labelKey ?? '') || meta[s]?.labelFallback || s,
        transitionLabel: (to, getString) =>
            getString(meta[to]?.transitionLabelKey ?? '') || meta[to]?.transitionLabelFallback || s2label(to),
        transitionColor: (to) => meta[to]?.transitionColor ?? 'primary',
    };
}

// Last-resort label for a transition with no configured key: the raw status.
const s2label = (s: string): string => s;
