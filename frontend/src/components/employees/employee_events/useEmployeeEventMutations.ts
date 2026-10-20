// src/components/employees/employee_events/useEmployeeEventMutations.ts
// Page-level event mutations (apply / delete / revert). Create (+ apply) lives in
// EmployeeEventCreateDialog; change rows of an existing event in the drawer.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    applyEmployeeEvent,
    deleteEmployeeEvent,
    fetchEmployeeEventStatuses,
    revertEmployeeEvent,
} from './employeeEventApi';

export const employeeEventsQK = (employeeId: number) => ['employee-events', employeeId];

interface Options {
    employeeId: number;
    setSnackbar: (s: { open: boolean; message: string; severity: 'success' | 'error' }) => void;
    onApplySuccess?: () => void;
    onDeleteSuccess?: () => void;
    onRevertSuccess?: () => void;
}

export function useEmployeeEventMutations({
    employeeId,
    setSnackbar,
    onApplySuccess,
    onDeleteSuccess,
    onRevertSuccess,
}: Options) {
    const qc = useQueryClient();
    const qk = employeeEventsQK(employeeId);

    const { data: eventStatuses = [] } = useQuery({
        queryKey: ['employee-event-statuses'],
        queryFn: fetchEmployeeEventStatuses,
        staleTime: 10 * 60 * 1000,
    });

    const invalidate = () => qc.invalidateQueries({ queryKey: qk });
    // axiosInstance rejects with Error(detail) when the backend sent one.
    const showError = (err: unknown, fallback: string) =>
        setSnackbar({ open: true, message: (err as Error).message || fallback, severity: 'error' });

    const applyMutation = useMutation({
        mutationFn: (eventId: number) => {
            const applied = eventStatuses.find((s) => s.name === 'applied');
            if (!applied) throw new Error('Applied status not found');
            return applyEmployeeEvent(employeeId, eventId, applied.id);
        },
        // Awaited so the row's spinner stays until the list shows "applied".
        onSuccess: async () => {
            await invalidate();
            onApplySuccess?.();
        },
        onError: (err: unknown) => showError(err, 'Error applying event'),
    });

    const deleteMutation = useMutation({
        mutationFn: (eventId: number) => deleteEmployeeEvent(employeeId, eventId),
        onSuccess: () => {
            invalidate();
            onDeleteSuccess?.();
        },
        onError: (err: unknown) => showError(err, 'Error deleting event'),
    });

    const revertMutation = useMutation({
        mutationFn: (eventId: number) => revertEmployeeEvent(employeeId, eventId),
        onSuccess: () => {
            invalidate();
            onRevertSuccess?.();
        },
        onError: (err: unknown) => showError(err, 'Error reverting event'),
    });

    return { applyMutation, deleteMutation, revertMutation };
}
