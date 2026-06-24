// src/components/admin/employee_event_types/useEmployeeEventTypeMutations.ts
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {createEmployeeEventType, deleteEmployeeEventType, updateEmployeeEventType,} from './employeeEventTypeApi.ts';
import {EMPLOYEE_EVENT_TYPE_QK} from "../../../../utils/queryKeys.ts";
import type {SnackbarType} from "../../../../types/types.ts";

interface Props {
    setSnackbar: (s: SnackbarType) => void;
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