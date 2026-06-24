// src/components/admin/department_categories/useDepartmentCategoryMutations.ts
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {createDepartmentCategory, deleteDepartmentCategory, updateDepartmentCategory,} from './departmentCategoryApi';
import {DEPARTMENT_CATEGORY_QK} from "../../../utils/queryKeys.ts";
import type {SnackbarType} from "../../../types/types.ts";

interface Props {
    setSnackbar: (s: SnackbarType) => void;
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
