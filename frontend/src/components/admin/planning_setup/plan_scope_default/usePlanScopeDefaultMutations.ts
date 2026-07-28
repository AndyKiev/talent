// src/components/admin/planning_setup/plan_scope_default/usePlanScopeDefaultMutations.ts
import {
    createPlanScopeDefault,
    deletePlanScopeDefault,
} from '../planningSetupApi';
import { PLAN_SCOPE_DEFAULT_QK } from '../../../../utils/queryKeys.ts';
import type { SnackbarType } from '../../../../types/types.ts';
import { useCrudMutations } from '../../../../hooks/useCrudMutations';

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
    // The entity has no update endpoint. A stub is provided so the helper's
    // type contract is satisfied; the returned updateMutation is never exposed.
    const noopUpdateFn = (() =>
        Promise.reject(new Error('Update not supported'))) as typeof createPlanScopeDefault;

    const { createMutation, deleteMutation } = useCrudMutations({
        queryKey: PLAN_SCOPE_DEFAULT_QK,
        createFn: createPlanScopeDefault,
        updateFn: noopUpdateFn,
        deleteFn: deletePlanScopeDefault,
        setSnackbar,
        onCreateSuccess,
        onDeleteSuccess,
        onDeleteError,
    });
    return { createMutation, deleteMutation };
}
