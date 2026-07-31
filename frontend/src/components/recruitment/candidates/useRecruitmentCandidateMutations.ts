import { createCandidate, updateCandidate, deleteCandidate } from './recruitmentCandidateApi';
import { RECRUITMENT_CANDIDATES_QK } from '../../../utils/queryKeys';
import { useCrudMutations, type CrudMutationCallbacks } from '../../../hooks/useCrudMutations';

export function useCandidateMutations(callbacks: CrudMutationCallbacks) {
    const crud = useCrudMutations({
        queryKey: RECRUITMENT_CANDIDATES_QK,
        createFn: createCandidate,
        updateFn: updateCandidate,
        deleteFn: deleteCandidate,
        ...callbacks,
    });
    return crud;
}
