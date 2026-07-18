// src/components/admin/planning_setup/plan_session_status/usePlanSessionStatusMutations.ts
import {
    createPlanSessionStatus,
    updatePlanSessionStatus,
    deletePlanSessionStatus,
} from '../planningSetupApi';
import { PLAN_SESSION_STATUS_QK } from '../../../../utils/queryKeys.ts';
import { useCrudMutations, type CrudMutationCallbacks } from '../../../../hooks/useCrudMutations';

export function usePlanSessionStatusMutations(callbacks: CrudMutationCallbacks) {
    const crud = useCrudMutations({
        queryKey: PLAN_SESSION_STATUS_QK,
        createFn: createPlanSessionStatus,
        updateFn: updatePlanSessionStatus,
        deleteFn: deletePlanSessionStatus,
        ...callbacks,
    });
    return crud;
}
