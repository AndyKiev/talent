// src/components/people-review/rseStatus.ts
//
// THE single definition of the review-session-employee (RSE) lifecycle
// `open → reviewed → closed` (with revert/reopen backward edges), as a
// statusMachine config. Consumed by BOTH the roster (SessionEmployeesPage)
// and the evaluation header (EvaluationPage) — previously each hand-coded its
// own copy of these rules, which could drift.
import type { GetStringFn } from '../../types/getStringFn';
import { defineStatusMachine, type StatusChipColor } from '../../utils/statusMachine';

export type RseStatus = 'open' | 'reviewed' | 'closed';

export const rseStatusMachine = defineStatusMachine<RseStatus>({
    transitions: {
        open: ['reviewed'],
        reviewed: ['closed', 'open'],
        closed: ['reviewed', 'open'],
    },
    meta: {
        open: { color: 'info', labelKey: 'statusOpen', labelFallback: 'open' },
        reviewed: { color: 'warning', labelKey: 'statusReviewed', labelFallback: 'reviewed' },
        closed: { color: 'success', labelKey: 'statusClosed', labelFallback: 'closed' },
    },
});

/** Chip color for an RSE status (unknown/legacy values render neutral). */
export const rseStatusColor = (status: string): StatusChipColor =>
    (['open', 'reviewed', 'closed'] as const).includes(status as RseStatus)
        ? rseStatusMachine.color(status as RseStatus)
        : 'default';

/** Translated label for an RSE status. */
export const rseStatusLabel = (status: string, getString: GetStringFn): string =>
    (['open', 'reviewed', 'closed'] as const).includes(status as RseStatus)
        ? rseStatusMachine.label(status as RseStatus, getString)
        : getString(status) || status;

// Hex accents for the evaluation header chip (rendered as `${hex}18` bg + hex
// text — not MUI chip palette colors, so kept separate from the machine meta).
export const RSE_STATUS_HEX: Record<string, string> = {
    open: '#1565C0',
    reviewed: '#E65100',
    closed: '#2E7D32',
};

// The parent SESSION lifecycle (pending/open/closed) is backend-driven; the UI
// only labels it. Kept here so both pages share one map.
const SESSION_STATUS_LABEL_KEYS: Record<string, string> = {
    pending: 'statusPending',
    open: 'statusOpen',
    closed: 'statusClosed',
};

export const sessionStatusLabel = (status: string, getString: GetStringFn): string =>
    getString(SESSION_STATUS_LABEL_KEYS[status] ?? status) || status;

// Chip color for the parent SESSION lifecycle (pending/open/closed). Kept next to
// the label map so both pages share one source instead of hand-rolled ternaries.
const SESSION_STATUS_COLORS: Record<string, StatusChipColor> = {
    open: 'success',
    closed: 'error',
    pending: 'default',
};

export const sessionStatusColor = (status: string): StatusChipColor =>
    SESSION_STATUS_COLORS[status] ?? 'default';

/** An RSE is editable only while BOTH the record and its session are open. */
export const isRseEditable = (status?: string, sessionStatus?: string): boolean =>
    status === 'open' && sessionStatus === 'open';

/** Is `from → to` legal for the user right now (session must not be closed)? */
export const canTransitionRse = (
    from: string,
    to: RseStatus,
    sessionStatus: string,
): boolean =>
    sessionStatus !== 'closed' &&
    rseStatusMachine.canMove(from as RseStatus, to);
