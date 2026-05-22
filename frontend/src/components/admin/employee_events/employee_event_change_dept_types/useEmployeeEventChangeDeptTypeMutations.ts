// src/components/admin/employee_events/employee_event_change-dept_types/useEmployeeEventChangeDeptTypeMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    createEmployeeEventChangeDeptType,
    updateEmployeeEventChangeDeptType,
    deleteEmployeeEventChangeDeptType,
} from './employeeEventChangeDeptTypeApi';

type Snackbar = { open: boolean; message: string; severity: 'success' | 'error' };

export const EMPLOYEE_EVENT_CHANGE_DEPT_TYPE_QK = ['employee_event_change_dept_types'] as const;

interface Props {
    setSnackbar: (s: Snackbar) => void;
    onCreateSuccess?: () => void;
    onUpdateSuccess?: () => void;
    onDeleteSuccess?: () => void;
    onDeleteError?: () => void;
}

export function useEmployeeEventChangeDeptTypeMutations({
    setSnackbar,
    onCreateSuccess,
    onUpdateSuccess,
    onDeleteSuccess,
    onDeleteError,
}: Props) {
    const qc = useQueryClient();

    const createMutation = useMutation({
        mutationFn: createEmployeeEventChangeDeptType,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: EMPLOYEE_EVENT_CHANGE_DEPT_TYPE_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onCreateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const updateMutation = useMutation({
        mutationFn: updateEmployeeEventChangeDeptType,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: EMPLOYEE_EVENT_CHANGE_DEPT_TYPE_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onUpdateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteEmployeeEventChangeDeptType,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: EMPLOYEE_EVENT_CHANGE_DEPT_TYPE_QK });
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
