// src/components/developer/process_roles/process_role/useProcessRoleMutations.ts
import {
    createProcessRole,
    updateProcessRole,
    deleteProcessRole,
} from './processRoleApi';
import { PROCESS_ROLE_QK } from '../../../../utils/queryKeys.ts';
import { useCrudMutations, type CrudMutationCallbacks } from '../../../../hooks/useCrudMutations';

export function useProcessRoleMutations(callbacks: CrudMutationCallbacks) {
    const crud = useCrudMutations({
        queryKey: PROCESS_ROLE_QK,
        createFn: createProcessRole,
        updateFn: updateProcessRole,
        deleteFn: deleteProcessRole,
        ...callbacks,
    });
    return crud;
}
