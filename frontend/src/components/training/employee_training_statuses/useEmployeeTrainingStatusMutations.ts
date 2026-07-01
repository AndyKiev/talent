// src/components/training/employee_training_statuses/useEmployeeTrainingStatusMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    createEmployeeTrainingStatus,
    deleteEmployeeTrainingStatus,
    updateEmployeeTrainingStatus,
} from './employeeTrainingStatusApi';
import { EMPLOYEE_TRAINING_STATUS_QK } from '../../../utils/queryKeys.ts';
import type { SnackbarType } from '../../../types/types.ts';

interface Props {
    setSnackbar: (s: SnackbarType) => void;
    onCreateSuccess?: () => void;
    onUpdateSuccess?: () => void;
    onDeleteSuccess?: () => void;
    onDeleteError?: () => void;
}

export function useEmployeeTrainingStatusMutations({
    setSnackbar,
    onCreateSuccess,
    onUpdateSuccess,
    onDeleteSuccess,
    onDeleteError,
}: Props) {
    const qc = useQueryClient();

    const createMutation = useMutation({
        mutationFn: createEmployeeTrainingStatus,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: EMPLOYEE_TRAINING_STATUS_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onCreateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const updateMutation = useMutation({
        mutationFn: updateEmployeeTrainingStatus,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: EMPLOYEE_TRAINING_STATUS_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onUpdateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteEmployeeTrainingStatus,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: EMPLOYEE_TRAINING_STATUS_QK });
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
