// src/components/employees/employee_events/employeeEventStatus.ts
//
// Employee-event lifecycle as a statusMachine config. The FORWARD direction
// (draft → ready → applied) is driven by the backend scheduler; the UI can
// only step BACKWARD (applied → ready → draft), so the machine's transitions
// encode exactly the client-triggerable moves. Mirrors the backend rules.
import { defineStatusMachine, type StatusChipColor } from '../../../utils/statusMachine';

export type EmployeeEventStatus = 'draft' | 'ready' | 'applied';

export const employeeEventStatusMachine = defineStatusMachine<EmployeeEventStatus>({
    transitions: {
        applied: ['ready'],
        ready: ['draft'],
        draft: [],
    },
    meta: {
        draft: { color: 'warning', labelKey: 'draft', labelFallback: 'draft' },
        ready: { color: 'info', labelKey: 'ready', labelFallback: 'ready' },
        applied: { color: 'success', labelKey: 'applied', labelFallback: 'applied' },
    },
});

/** Chip color for an event status (unknown/legacy values render neutral). */
export const eventStatusColor = (status: string): StatusChipColor =>
    (['draft', 'ready', 'applied'] as const).includes(status as EmployeeEventStatus)
        ? employeeEventStatusMachine.color(status as EmployeeEventStatus)
        : 'default';

/** One backward step for the given status, or null when nothing to revert. */
export const revertTargetOf = (status: string): EmployeeEventStatus | null => {
    const next = (['draft', 'ready', 'applied'] as const).includes(status as EmployeeEventStatus)
        ? employeeEventStatusMachine.nextStatuses(status as EmployeeEventStatus)
        : [];
    return next.length > 0 ? next[0] : null;
};
