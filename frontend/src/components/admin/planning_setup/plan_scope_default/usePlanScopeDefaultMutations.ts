// src/components/admin/planning_setup/plan_scope_default/usePlanScopeDefaultMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    createPlanScopeDefault,
    deletePlanScopeDefault,
} from '../planningSetupApi';
import { PLAN_SCOPE_DEFAULT_QK } from '../../../../utils/queryKeys.ts';
import type { SnackbarType } from '../../../../types/types.ts';

interface Props {
    setSnackbar: (s: SnackbarType) => void;
    onCreateSuccess?: () => void;
    onDeleteSuccess?: () => void;
    onDeleteError?: () => void;
}

export function usePlanScopeDefaultMutations({
    setSnackbar,
    onCreateSuccess,
    onDeleteSuccess,
    onDeleteError,
}: Props) {
    const qc = useQueryClient();

    const invalidate = async () => {
        await qc.invalidateQueries({ queryKey: PLAN_SCOPE_DEFAULT_QK });
    };

    const createMutation = useMutation({
        mutationFn: createPlanScopeDefault,
        onSuccess: async (res) => {
            await invalidate();
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onCreateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deletePlanScopeDefault,
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

    return { createMutation, deleteMutation };
}
