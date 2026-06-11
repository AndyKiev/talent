// src/components/planning/usePlanScopeMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updatePlanScope, deletePlanScope } from './planningApi';
import { PLAN_SCOPE_QK } from '../../utils/queryKeys.ts';
import type { SnackbarType } from '../../types/types.ts';

interface Props {
    planSessionId: number;
    setSnackbar: (s: SnackbarType) => void;
    onUpdateSuccess?: () => void;
    onDeleteSuccess?: () => void;
    onDeleteError?: () => void;
}

export function usePlanScopeMutations({
    planSessionId,
    setSnackbar,
    onUpdateSuccess,
    onDeleteSuccess,
    onDeleteError,
}: Props) {
    const qc = useQueryClient();

    const invalidate = () =>
        qc.invalidateQueries({ queryKey: [...PLAN_SCOPE_QK, planSessionId] });

    const updateMutation = useMutation({
        mutationFn: updatePlanScope,
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
        mutationFn: deletePlanScope,
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

    return { updateMutation, deleteMutation };
}
