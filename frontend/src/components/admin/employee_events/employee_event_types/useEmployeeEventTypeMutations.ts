// src/components/admin/employee_event_types/useEmployeeEventTypeMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    createEmployeeEventType,
    updateEmployeeEventType,
    deleteEmployeeEventType,
} from './employeeEventTypeApi.ts';

type Snackbar = { open: boolean; message: string; severity: 'success' | 'error' };

export const EMPLOYEE_EVENT_TYPE_QK = ['employee_event_types'] as const;

interface Props {
    setSnackbar: (s: Snackbar) => void;
    onCreateSuccess?: () => void;
    onUpdateSuccess?: () => void;
    onDeleteSuccess?: () => void;
    onDeleteError?: () => void;
}

export function useEmployeeEventTypeMutations({
                                                  setSnackbar,
                                                  onCreateSuccess,
                                                  onUpdateSuccess,
                                                  onDeleteSuccess,
                                                  onDeleteError,
                                              }: Props) {
    const qc = useQueryClient();

    const createMutation = useMutation({
        mutationFn: createEmployeeEventType,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: EMPLOYEE_EVENT_TYPE_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onCreateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const updateMutation = useMutation({
        mutationFn: updateEmployeeEventType,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: EMPLOYEE_EVENT_TYPE_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onUpdateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteEmployeeEventType,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: EMPLOYEE_EVENT_TYPE_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onDeleteSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
            onDeleteError?.();
        },
    });

    return { createMutation, updateMutation, deleteMutation };
}