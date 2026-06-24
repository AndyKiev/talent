// src/components/admin/regions/useRegionMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createRegion, deleteRegion, updateRegion, moveRegion } from './regionApi';
import { REGION_QK } from '../../../utils/queryKeys.ts';
import type { SnackbarType } from '../../../types/types.ts';

interface Props {
    setSnackbar: (s: SnackbarType) => void;
    onCreateSuccess?: () => void;
    onUpdateSuccess?: () => void;
    onDeleteSuccess?: () => void;
    onDeleteError?: () => void;
    onMoveError?: () => void;
}

export function useRegionMutations({
    setSnackbar,
    onCreateSuccess,
    onUpdateSuccess,
    onDeleteSuccess,
    onDeleteError,
    onMoveError,
}: Props) {
    const qc = useQueryClient();

    const createMutation = useMutation({
        mutationFn: createRegion,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: REGION_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onCreateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const updateMutation = useMutation({
        mutationFn: updateRegion,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: REGION_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onUpdateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteRegion,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: REGION_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onDeleteSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
            onDeleteError?.();
        },
    });

    const moveMutation = useMutation({
        mutationFn: moveRegion,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: REGION_QK });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
            onMoveError?.();
        },
    });

    return { createMutation, updateMutation, deleteMutation, moveMutation };
}
