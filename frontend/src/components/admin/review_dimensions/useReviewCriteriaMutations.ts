import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    createCriteria,
    updateCriteria,
    deleteCriteria,
} from './reviewDimensionApi';
import { REVIEW_DIMENSION_QK } from './useReviewDimensionMutations';

type Snackbar = { open: boolean; message: string; severity: 'success' | 'error' };

export const REVIEW_CRITERIA_QK = (dimensionId: number) =>
    ['review_dimension_criteria', dimensionId] as const;

interface Props {
    dimensionId: number;
    setSnackbar: (s: Snackbar) => void;
    onCreateSuccess?: () => void;
    onUpdateSuccess?: () => void;
}

export function useReviewCriteriaMutations({
    dimensionId,
    setSnackbar,
    onCreateSuccess,
    onUpdateSuccess,
}: Props) {
    const qc = useQueryClient();

    // Refresh the criteria list AND the dimensions list (its criteria-count chip).
    const invalidate = async () => {
        await qc.invalidateQueries({ queryKey: REVIEW_CRITERIA_QK(dimensionId) });
        await qc.invalidateQueries({ queryKey: REVIEW_DIMENSION_QK });
    };

    const createMutation = useMutation({
        mutationFn: createCriteria,
        onSuccess: async (res) => {
            await invalidate();
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onCreateSuccess?.();
        },
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    const updateMutation = useMutation({
        mutationFn: updateCriteria,
        onSuccess: async (res) => {
            await invalidate();
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onUpdateSuccess?.();
        },
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteCriteria,
        onSuccess: async (res) => {
            await invalidate();
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
        },
        onError: (err: Error) => setSnackbar({ open: true, message: err.message, severity: 'error' }),
    });

    // Reordering is shared with the dimensions grid via useArrowReorder.
    return { createMutation, updateMutation, deleteMutation };
}
