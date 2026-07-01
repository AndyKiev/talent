// src/components/admin/job_categories/useJobCategoryMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    createJobCategory,
    deleteJobCategory,
    updateJobCategory,
    clearAllJobCategoryLinks,
} from './jobCategoryApi';
import { JOB_CATEGORY_QK, JOB_QK } from '../../../utils/queryKeys.ts';
import type { SnackbarType } from '../../../types/types.ts';

interface Props {
    setSnackbar: (s: SnackbarType) => void;
    onCreateSuccess?: () => void;
    onUpdateSuccess?: () => void;
    onDeleteSuccess?: () => void;
    onDeleteError?: () => void;
    onClearAllSuccess?: () => void;
}

export function useJobCategoryMutations({
    setSnackbar,
    onCreateSuccess,
    onUpdateSuccess,
    onDeleteSuccess,
    onDeleteError,
    onClearAllSuccess,
}: Props) {
    const qc = useQueryClient();

    const createMutation = useMutation({
        mutationFn: createJobCategory,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: JOB_CATEGORY_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onCreateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const updateMutation = useMutation({
        mutationFn: updateJobCategory,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: JOB_CATEGORY_QK });
            // A category's key change also affects how it shows on the jobs grid.
            await qc.invalidateQueries({ queryKey: JOB_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onUpdateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteJobCategory,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: JOB_CATEGORY_QK });
            // Deleting a category CASCADE-removes its job links — refresh jobs too.
            await qc.invalidateQueries({ queryKey: JOB_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onDeleteSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
            onDeleteError?.();
        },
    });

    const clearAllMutation = useMutation({
        mutationFn: clearAllJobCategoryLinks,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: JOB_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onClearAllSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    return { createMutation, updateMutation, deleteMutation, clearAllMutation };
}
