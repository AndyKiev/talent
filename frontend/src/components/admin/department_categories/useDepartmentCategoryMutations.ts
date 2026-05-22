// src/components/admin/department_categories/useDepartmentCategoryMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    createDepartmentCategory,
    updateDepartmentCategory,
    deleteDepartmentCategory,
} from './departmentCategoryApi';

type Snackbar = { open: boolean; message: string; severity: 'success' | 'error' };

export const DEPARTMENT_CATEGORY_QK = ['department_categories'] as const;

interface Props {
    setSnackbar: (s: Snackbar) => void;
    onCreateSuccess?: () => void;
    onUpdateSuccess?: () => void;
    onDeleteSuccess?: () => void;
    onDeleteError?: () => void;
}

export function useDepartmentCategoryMutations({
    setSnackbar,
    onCreateSuccess,
    onUpdateSuccess,
    onDeleteSuccess,
    onDeleteError,
}: Props) {
    const qc = useQueryClient();

    const createMutation = useMutation({
        mutationFn: createDepartmentCategory,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: DEPARTMENT_CATEGORY_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onCreateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const updateMutation = useMutation({
        mutationFn: updateDepartmentCategory,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: DEPARTMENT_CATEGORY_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onUpdateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteDepartmentCategory,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: DEPARTMENT_CATEGORY_QK });
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
