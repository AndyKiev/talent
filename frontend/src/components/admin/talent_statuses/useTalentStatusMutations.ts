// src/components/admin/talent-statuses/useTalentStatusMutations.ts
import {createTalentStatus, deleteTalentStatus, updateTalentStatus,} from './talentStatusApi';
import { TALENT_STATUS_QK } from "../../../utils/queryKeys.ts";
import { useCrudMutations, type CrudMutationCallbacks } from '../../../hooks/useCrudMutations';

export function useTalentStatusMutations(callbacks: CrudMutationCallbacks) {
    const crud = useCrudMutations({
        queryKey: TALENT_STATUS_QK,
        createFn: createTalentStatus,
        updateFn: updateTalentStatus,
        deleteFn: deleteTalentStatus,
        ...callbacks,
    });
    return crud;
}
