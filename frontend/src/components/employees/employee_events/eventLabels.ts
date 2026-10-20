// src/components/employees/employee_events/eventLabels.ts
// Event types / direction types are DB lookups whose `name` column holds one
// (Ukrainian) label, so it is never shown. Their `code` is the contract: the
// label is the msg_key derived from it (TEMPORARY_LEAVE -> eventTypeTemporaryLeave).
// Employee status names are already msg_keys themselves (working, maternity, ...).
import type { GetStringFn } from '../../../types/getStringFn';
import cfl from '../../../utils/helpers.ts';

const codeToPascal = (code: string) =>
    code
        .toLowerCase()
        .split('_')
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join('');

export const eventTypeLabel = (getString: GetStringFn, code?: string | null) =>
    code ? cfl(getString(`eventType${codeToPascal(code)}`) || code) : '—';

export const directionTypeLabel = (getString: GetStringFn, code?: string | null) =>
    code ? cfl(getString(`directionType${codeToPascal(code)}`) || code) : '—';

export const employeeStatusLabel = (getString: GetStringFn, name?: string | null) =>
    name ? cfl(getString(name) || name) : '—';

// Event types that move the employee's status, and the statuses they may start
// from (mirrors backend employee_status_transitions.py — the backend still
// enforces it on apply; this only hides types that would fail).
const SOURCE_STATUSES_BY_EVENT_CODE: Record<string, string[]> = {
    TEMPORARY_LEAVE: ['working'],
    DISMISSAL: ['working'],
    RETURN: ['maternity', 'coscription'],
};

export const isEventTypeAllowedForStatus = (code: string, statusName?: string | null) => {
    const sources = SOURCE_STATUSES_BY_EVENT_CODE[code];
    return !sources || (statusName != null && sources.includes(statusName));
};

// Target statuses an HRM may pick for TEMPORARY_LEAVE.
export const TEMPORARY_LEAVE_STATUSES = ['maternity', 'coscription'];

// Event types whose STATUS_CHANGE the backend creates itself (never picked).
export const STATUS_AUTO_CODES = ['ACTIVATION', 'RETURN', 'DISMISSAL'];
