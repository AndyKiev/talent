// src/components/planning/usePlanSessionMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    createPlanSession,
    updatePlanSession,
    openPlanSession,
    closePlanSession,
    revertPlanSession,
    deletePlanSession,
} from './planningApi';
import { PLAN_SESSION_QK } from '../../utils/queryKeys.ts';
import type { SnackbarType } from '../../types/types.ts';

interface Props {
    setSnackbar: (s: SnackbarType) => void;
    onCreateSuccess?: () => void;
    onUpdateSuccess?: () => void;
    onStatusSuccess?: () => void;
    onStatusError?: () => void;
    onDeleteSuccess?: () => void;
    onDeleteError?: () => void;
}

export function usePlanSessionMutations({
    setSnackbar,
    onCreateSuccess,
    onUpdateSuccess,
    onStatusSuccess,
    onStatusError,
    onDeleteSuccess,
    onDeleteError,
}: Props) {
    const qc = useQueryClient();

    const invalidate = async () => {
        await qc.invalidateQueries({ queryKey: PLAN_SESSION_QK });
    };

    const createMutation = useMutation({
        mutationFn: createPlanSession,
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
        mutationFn: updatePlanSession,
        onSuccess: async (res) => {
            await invalidate();
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onUpdateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
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

    const deleteMutation = useMutation({
        mutationFn: deletePlanSession,
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

    return {
        createMutation,
        updateMutation,
        openMutation,
        closeMutation,
        revertMutation,
        deleteMutation,
    };
}
