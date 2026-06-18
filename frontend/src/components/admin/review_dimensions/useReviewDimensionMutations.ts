import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    createReviewDimension,
    updateReviewDimension,
    deleteReviewDimension,
} from './reviewDimensionApi';

type Snackbar = { open: boolean; message: string; severity: 'success' | 'error' };

export const REVIEW_DIMENSION_QK = ['review_dimensions'] as const;

interface Props {
    setSnackbar: (s: Snackbar) => void;
    onCreateSuccess?: () => void;
    onUpdateSuccess?: () => void;
    onDeleteSuccess?: () => void;
    onDeleteError?: () => void;
}

export function useReviewDimensionMutations({
    setSnackbar,
    onCreateSuccess,
    onUpdateSuccess,
    onDeleteSuccess,
    onDeleteError,
}: Props) {
    const qc = useQueryClient();

    const createMutation = useMutation({
        mutationFn: createReviewDimension,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: REVIEW_DIMENSION_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onCreateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const updateMutation = useMutation({
        mutationFn: updateReviewDimension,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: REVIEW_DIMENSION_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onUpdateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteReviewDimension,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: REVIEW_DIMENSION_QK });
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
