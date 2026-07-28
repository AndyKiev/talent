// src/components/admin/planning_setup/plan_category_default/usePlanCategoryDefaultMutations.ts
import {
    createPlanCategoryDefault,
    deletePlanCategoryDefault,
} from '../planningSetupApi';
import { PLAN_CATEGORY_DEFAULT_QK } from '../../../../utils/queryKeys.ts';
import type { SnackbarType } from '../../../../types/types.ts';
import { useCrudMutations } from '../../../../hooks/useCrudMutations';

interface Props {
    setSnackbar: (s: SnackbarType) => void;
    onCreateSuccess?: () => void;
    onDeleteSuccess?: () => void;
    onDeleteError?: () => void;
}

export function usePlanCategoryDefaultMutations({
    setSnackbar,
    onCreateSuccess,
    onDeleteSuccess,
    onDeleteError,
}: Props) {
    // The entity has no update endpoint. A stub is provided so the helper's
    // type contract is satisfied; the returned updateMutation is never exposed.
    const noopUpdateFn = (() =>
        Promise.reject(new Error('Update not supported'))) as typeof createPlanCategoryDefault;

    const { createMutation, deleteMutation } = useCrudMutations({
        queryKey: PLAN_CATEGORY_DEFAULT_QK,
        createFn: createPlanCategoryDefault,
        updateFn: noopUpdateFn,
        deleteFn: deletePlanCategoryDefault,
        setSnackbar,
        onCreateSuccess,
        onDeleteSuccess,
        onDeleteError,
    });
    return { createMutation, deleteMutation };
}
