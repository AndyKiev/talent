// src/components/training/state/trainingStatusMeta.ts
// Status metadata for the State tab. The ORDER is NOT hardcoded — it is derived
// from the DB: the synthetic not_planned first (eligible-but-unassigned
// employees have no status row), then the user-managed statuses by their
// admin-defined sort_order (see the Training > Statuses tab + /fe-sorting1).
import cfl, { snakeToCamel } from '../../../utils/helpers.ts';
import type { GetStringFn } from '../../../types/getStringFn.ts';
import type { EmployeeTrainingStatus } from '../employee_training_statuses/employeeTrainingStatusApi.ts';

// Synthetic status emitted by the backend for eligible-but-unassigned employees.
export const NOT_PLANNED_KEY = 'not_planned';

// Colours for the well-known keys; any user-added status gets a stable,
// deterministic fallback colour so bars/chips never collide with "no colour".
const KNOWN_COLORS: Record<string, string> = {
    not_planned: '#bdbdbd', // grey
    planned: '#42a5f5', // blue
    in_process: '#ffa726', // orange
    passed: '#66bb6a', // green
};
const FALLBACK_PALETTE = ['#ab47bc', '#26a69a', '#ec407a', '#8d6e63', '#5c6bc0', '#d4e157', '#ff7043'];

export function statusColor(key: string): string {
    if (KNOWN_COLORS[key]) return KNOWN_COLORS[key];
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
    return FALLBACK_PALETTE[h % FALLBACK_PALETTE.length];
}

// Ordered status keys for the whole State tab (filter / tally / bars / legend):
// not_planned first, then DB statuses by sort_order (id tiebreak).
export function buildStatusOrder(statuses: EmployeeTrainingStatus[]): string[] {
    const dbKeys = [...statuses]
        .sort((a, b) => (a.sort_order - b.sort_order) || (a.id - b.id))
        .map((s) => s.key);
    return [NOT_PLANNED_KEY, ...dbKeys];
}

// Label resolves via the training-UI prefix convention (e.g. trainingStatusInProcess),
// with a graceful fallback to the raw key.
export function trainingStatusLabel(getString: GetStringFn, key: string): string {
    const msgKey = `trainingStatus${cfl(snakeToCamel(key))}`;
    const translated = getString(msgKey);
    return translated === msgKey ? cfl(key.replace(/_/g, ' ')) : cfl(translated);
}
