// src/components/admin/regions/useRegionMutations.ts
import { createRegion, deleteRegion, updateRegion, moveRegion } from './regionApi';
import { REGION_QK } from '../../../utils/queryKeys.ts';
import { useCrudMutations, useMoveMutation, type CrudMutationCallbacks } from '../../../hooks/useCrudMutations';

export function useRegionMutations(callbacks: CrudMutationCallbacks) {
    const crud = useCrudMutations({
        queryKey: REGION_QK,
        createFn: createRegion,
        updateFn: updateRegion,
        deleteFn: deleteRegion,
        ...callbacks,
    });
    const moveMutation = useMoveMutation({ queryKey: REGION_QK, moveFn: moveRegion, ...callbacks });
    return { ...crud, moveMutation };
}
