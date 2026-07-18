// src/components/developer/process_roles/process/useProcessMutations.ts
import {
    createProcess,
    updateProcess,
    deleteProcess,
} from './processApi';
import { PROCESS_QK } from '../../../../utils/queryKeys.ts';
import { useCrudMutations, type CrudMutationCallbacks } from '../../../../hooks/useCrudMutations';

export function useProcessMutations(callbacks: CrudMutationCallbacks) {
    const crud = useCrudMutations({
        queryKey: PROCESS_QK,
        createFn: createProcess,
        updateFn: updateProcess,
        deleteFn: deleteProcess,
        ...callbacks,
    });
    return crud;
}
