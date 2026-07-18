// src/components/admin/talent-periods/useTalentPeriodMutations.ts
import {createTalentPeriod, deleteTalentPeriod, updateTalentPeriod,} from './talentPeriodApi';
import { TALENT_PERIOD_QK } from "../../../utils/queryKeys.ts";
import { useCrudMutations, type CrudMutationCallbacks } from '../../../hooks/useCrudMutations';

export function useTalentPeriodMutations(callbacks: CrudMutationCallbacks) {
    const crud = useCrudMutations({
        queryKey: TALENT_PERIOD_QK,
        createFn: createTalentPeriod,
        updateFn: updateTalentPeriod,
        deleteFn: deleteTalentPeriod,
        ...callbacks,
    });
    return crud;
}
