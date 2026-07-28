// src/components/planning/usePlanSessionMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    createPlanSession,
    updatePlanSession,
    openPlanSession,
    closePlanSession,
    revertPlanSession,
    resyncPlanSession,
    deletePlanSession,
} from './planningApi';
import { PLAN_SESSION_QK } from '../../utils/queryKeys.ts';
import type { SnackbarType } from '../../types/types.ts';
import { useCrudMutations } from '../../hooks/useCrudMutations';

interface Props {
    setSnackbar: (s: SnackbarType) => void;
    onCreateSuccess?: () => void;
    onUpdateSuccess?: () => void;
    onStatusSuccess?: () => void;
    onStatusError?: () => void;
    onResyncSuccess?: () => void;
    onResyncError?: () => void;
    onDeleteSuccess?: () => void;
    onDeleteError?: () => void;
}

export function usePlanSessionMutations({
    setSnackbar,
    onCreateSuccess,
    onUpdateSuccess,
    onStatusSuccess,
    onStatusError,
    onResyncSuccess,
    onResyncError,
    onDeleteSuccess,
    onDeleteError,
}: Props) {
    const qc = useQueryClient();

    const invalidate = async () => {
        await qc.invalidateQueries({ queryKey: PLAN_SESSION_QK });
    };

    const { createMutation, updateMutation, deleteMutation } = useCrudMutations({
        queryKey: PLAN_SESSION_QK,
        createFn: createPlanSession,
        updateFn: updatePlanSession,
        deleteFn: deletePlanSession,
        setSnackbar,
        onCreateSuccess,
        onUpdateSuccess,
        onDeleteSuccess,
        onDeleteError,
    });

    const openMutation = useMutation({
        mutationFn: openPlanSession,
        onSuccess: async (res) => {
            await invalidate();
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onStatusSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
            onStatusError?.();
        },
    });

    const closeMutation = useMutation({
        mutationFn: closePlanSession,
        onSuccess: async (res) => {
            await invalidate();
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onStatusSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
            onStatusError?.();
        },
    });

    const revertMutation = useMutation({
        mutationFn: revertPlanSession,
        onSuccess: async (res) => {
            await invalidate();
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onStatusSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
            onStatusError?.();
        },
    });

    const resyncMutation = useMutation({
        mutationFn: ({ id, addCategoryIds }: { id: number; addCategoryIds?: number[] }) =>
            resyncPlanSession(id, addCategoryIds),
        onSuccess: async (res) => {
            await invalidate();
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onResyncSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
            onResyncError?.();
        },
    });

    return {
        createMutation,
        updateMutation,
        openMutation,
        closeMutation,
        revertMutation,
        resyncMutation,
        deleteMutation,
    };
}
