import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    createReviewLevel,
    updateReviewLevel,
    deleteReviewLevel,
} from './reviewLevelApi';

type Snackbar = { open: boolean; message: string; severity: 'success' | 'error' };

export const REVIEW_LEVEL_QK = ['review_levels'] as const;

interface Props {
    setSnackbar: (s: Snackbar) => void;
    onCreateSuccess?: () => void;
    onUpdateSuccess?: () => void;
    onDeleteSuccess?: () => void;
    onDeleteError?: () => void;
}

export function useReviewLevelMutations({
    setSnackbar,
    onCreateSuccess,
    onUpdateSuccess,
    onDeleteSuccess,
    onDeleteError,
}: Props) {
    const qc = useQueryClient();

    const createMutation = useMutation({
        mutationFn: createReviewLevel,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: REVIEW_LEVEL_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onCreateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const updateMutation = useMutation({
        mutationFn: updateReviewLevel,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: REVIEW_LEVEL_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onUpdateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteReviewLevel,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: REVIEW_LEVEL_QK });
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
