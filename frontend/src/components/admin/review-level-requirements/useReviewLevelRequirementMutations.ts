import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    createReviewLevelRequirement,
    updateReviewLevelRequirement,
    deleteReviewLevelRequirement,
} from './reviewLevelRequirementApi';

type Snackbar = { open: boolean; message: string; severity: 'success' | 'error' };

export const REVIEW_LEVEL_REQUIREMENT_QK = ['review_level_requirements'] as const;

interface Props {
    setSnackbar: (s: Snackbar) => void;
    onCreateSuccess?: () => void;
    onUpdateSuccess?: () => void;
    onDeleteSuccess?: () => void;
    onDeleteError?: () => void;
}

export function useReviewLevelRequirementMutations({
    setSnackbar,
    onCreateSuccess,
    onUpdateSuccess,
    onDeleteSuccess,
    onDeleteError,
}: Props) {
    const qc = useQueryClient();

    const invalidate = () =>
        qc.invalidateQueries({ queryKey: REVIEW_LEVEL_REQUIREMENT_QK });

    const createMutation = useMutation({
        mutationFn: createReviewLevelRequirement,
        onSuccess: async (res) => {
            await invalidate();
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onCreateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const updateMutation = useMutation({
        mutationFn: updateReviewLevelRequirement,
        onSuccess: async (res) => {
            await invalidate();
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onUpdateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteReviewLevelRequirement,
        onSuccess: async (res) => {
            await invalidate();
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
