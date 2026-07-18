// src/components/admin/talent-status-period-links/useTalentStatusPeriodLinkMutations.ts
import {
    createTalentStatusPeriodLink,
    deleteTalentStatusPeriodLink,
    updateTalentStatusPeriodLink,
} from './talentStatusPeriodLinkApi';
import { TSPL_QK } from "../../../utils/queryKeys.ts";
import { useCrudMutations, type CrudMutationCallbacks } from '../../../hooks/useCrudMutations';

export function useTalentStatusPeriodLinkMutations(callbacks: CrudMutationCallbacks) {
    const crud = useCrudMutations({
        queryKey: TSPL_QK,
        createFn: createTalentStatusPeriodLink,
        updateFn: updateTalentStatusPeriodLink,
        deleteFn: deleteTalentStatusPeriodLink,
        ...callbacks,
    });
    return crud;
}
