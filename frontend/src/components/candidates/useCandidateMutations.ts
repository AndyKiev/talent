import { createCandidate, updateCandidate, deleteCandidate } from './candidateApi';
import { CANDIDATE_QK } from '../../utils/queryKeys';
import { useCrudMutations, type CrudMutationCallbacks } from '../../hooks/useCrudMutations';

export function useCandidateMutations(callbacks: CrudMutationCallbacks) {
    const crud = useCrudMutations({
        queryKey: CANDIDATE_QK,
        createFn: createCandidate,
        updateFn: updateCandidate,
        deleteFn: deleteCandidate,
        ...callbacks,
    });
    return crud;
}
