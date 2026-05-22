// src/components/admin/department_types/useDepartmentTypeMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    createDepartmentType,
    updateDepartmentType,
    deleteDepartmentType,
} from './departmentTypeApi';

type Snackbar = { open: boolean; message: string; severity: 'success' | 'error' };

export const DEPARTMENT_TYPE_QK = ['department_types'] as const;

interface Props {
    setSnackbar: (s: Snackbar) => void;
    onCreateSuccess?: () => void;
    onUpdateSuccess?: () => void;
    onDeleteSuccess?: () => void;
    onDeleteError?: () => void;
}

export function useDepartmentTypeMutations({
    setSnackbar,
    onCreateSuccess,
    onUpdateSuccess,
    onDeleteSuccess,
    onDeleteError,
}: Props) {
    const qc = useQueryClient();

    const createMutation = useMutation({
        mutationFn: createDepartmentType,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: DEPARTMENT_TYPE_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onCreateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const updateMutation = useMutation({
        mutationFn: updateDepartmentType,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: DEPARTMENT_TYPE_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onUpdateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteDepartmentType,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: DEPARTMENT_TYPE_QK });
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
