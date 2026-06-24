// src/components/admin/employee_events/employee_event_direction_types/useEmployeeEventDirectionTypeMutations.ts
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {
    createEmployeeEventDirectionType,
    deleteEmployeeEventDirectionType,
    updateEmployeeEventDirectionType,
} from './employeeEventDirectionTypeApi';
import {EMPLOYEE_EVENT_DIRECTION_TYPE_QK} from "../../../../utils/queryKeys.ts";
import type {SnackbarType} from "../../../../types/types.ts";


interface Props {
    setSnackbar: (s: SnackbarType) => void;
    onCreateSuccess?: () => void;
    onUpdateSuccess?: () => void;
    onDeleteSuccess?: () => void;
    onDeleteError?: () => void;
}

export function useEmployeeEventDirectionTypeMutations({
    setSnackbar,
    onCreateSuccess,
    onUpdateSuccess,
    onDeleteSuccess,
    onDeleteError,
}: Props) {
    const qc = useQueryClient();

    const createMutation = useMutation({
        mutationFn: createEmployeeEventDirectionType,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: EMPLOYEE_EVENT_DIRECTION_TYPE_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onCreateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const updateMutation = useMutation({
        mutationFn: updateEmployeeEventDirectionType,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: EMPLOYEE_EVENT_DIRECTION_TYPE_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onUpdateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteEmployeeEventDirectionType,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: EMPLOYEE_EVENT_DIRECTION_TYPE_QK });
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
