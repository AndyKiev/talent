// src/components/employees/employee_events/useEmployeeEventMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    createEmployeeEvent,
    updateEmployeeEvent,
    deleteEmployeeEvent,
    applyEmployeeEvent,
    revertEmployeeEvent,
    type EmployeeEventCreate,
    type EmployeeEventUpdate,
} from './employeeEventApi';

export const employeeEventsQK = (employeeId: number) => ['employee-events', employeeId];

interface Options {
    employeeId: number;
    setSnackbar: (s: { open: boolean; message: string; severity: 'success' | 'error' }) => void;
    onCreateSuccess?: () => void;
    onUpdateSuccess?: () => void;
    onDeleteSuccess?: () => void;
    onApplySuccess?: () => void;
    onRevertSuccess?: () => void;
}

export function useEmployeeEventMutations({
    employeeId,
    setSnackbar,
    onCreateSuccess,
    onUpdateSuccess,
    onDeleteSuccess,
    onApplySuccess,
    onRevertSuccess,
}: Options) {
    const qc = useQueryClient();
    const qk = employeeEventsQK(employeeId);

    const invalidate = () => qc.invalidateQueries({ queryKey: qk });

    const createMutation = useMutation({
        mutationFn: (payload: EmployeeEventCreate) =>
            createEmployeeEvent(employeeId, payload),
        onSuccess: () => {
            invalidate();
            onCreateSuccess?.();
        },
        onError: (err: unknown) => {
            const msg = (err as { response?: { data?: { detail?: string } } })
                ?.response?.data?.detail ?? 'Error creating event';
            setSnackbar({ open: true, message: msg, severity: 'error' });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ eventId, payload }: { eventId: number; payload: EmployeeEventUpdate }) =>
            updateEmployeeEvent(employeeId, eventId, payload),
        onSuccess: () => {
            invalidate();
            onUpdateSuccess?.();
        },
        onError: (err: unknown) => {
            const msg = (err as { response?: { data?: { detail?: string } } })
                ?.response?.data?.detail ?? 'Error updating event';
            setSnackbar({ open: true, message: msg, severity: 'error' });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (eventId: number) => deleteEmployeeEvent(employeeId, eventId),
        onSuccess: () => {
            invalidate();
            onDeleteSuccess?.();
        },
        onError: (err: unknown) => {
            const msg = (err as { response?: { data?: { detail?: string } } })
                ?.response?.data?.detail ?? 'Error deleting event';
            setSnackbar({ open: true, message: msg, severity: 'error' });
        },
    });

    const applyMutation = useMutation({
        mutationFn: ({ eventId, appliedStatusId }: { eventId: number; appliedStatusId: number }) =>
            applyEmployeeEvent(employeeId, eventId, appliedStatusId),
        onSuccess: () => {
            invalidate();
            onApplySuccess?.();
        },
        onError: (err: unknown) => {
            const msg = (err as { response?: { data?: { detail?: string } } })
                ?.response?.data?.detail ?? 'Error applying event';
            setSnackbar({ open: true, message: msg, severity: 'error' });
        },
    });

    const revertMutation = useMutation({
        mutationFn: (eventId: number) => revertEmployeeEvent(employeeId, eventId),
        onSuccess: () => {
            invalidate();
            onRevertSuccess?.();
        },
        onError: (err: unknown) => {
            const msg = (err as { response?: { data?: { detail?: string } } })
                ?.response?.data?.detail ?? 'Error reverting event';
            setSnackbar({ open: true, message: msg, severity: 'error' });
        },
    });

    return { createMutation, updateMutation, deleteMutation, applyMutation, revertMutation };
}
