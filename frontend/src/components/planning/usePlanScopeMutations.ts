// src/components/planning/usePlanScopeMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updatePlanScope } from './planningApi';
import { PLAN_SCOPE_QK } from '../../utils/queryKeys.ts';
import type { SnackbarType } from '../../types/types.ts';

interface Props {
    planSessionId: number;
    setSnackbar: (s: SnackbarType) => void;
    onUpdateSuccess?: () => void;
}

export function usePlanScopeMutations({ planSessionId, setSnackbar, onUpdateSuccess }: Props) {
    const qc = useQueryClient();

    const updateMutation = useMutation({
        mutationFn: updatePlanScope,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: [...PLAN_SCOPE_QK, planSessionId] });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onUpdateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    return { updateMutation };
}
