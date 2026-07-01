// src/components/training/training_categories/useTrainingCategoryMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    createTrainingCategory,
    deleteTrainingCategory,
    updateTrainingCategory,
} from './trainingCategoryApi';
import { TRAINING_CATEGORY_QK } from '../../../utils/queryKeys.ts';
import type { SnackbarType } from '../../../types/types.ts';

interface Props {
    setSnackbar: (s: SnackbarType) => void;
    onCreateSuccess?: () => void;
    onUpdateSuccess?: () => void;
    onDeleteSuccess?: () => void;
    onDeleteError?: () => void;
}

export function useTrainingCategoryMutations({
    setSnackbar,
    onCreateSuccess,
    onUpdateSuccess,
    onDeleteSuccess,
    onDeleteError,
}: Props) {
    const qc = useQueryClient();

    const createMutation = useMutation({
        mutationFn: createTrainingCategory,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: TRAINING_CATEGORY_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onCreateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const updateMutation = useMutation({
        mutationFn: updateTrainingCategory,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: TRAINING_CATEGORY_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onUpdateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteTrainingCategory,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: TRAINING_CATEGORY_QK });
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
