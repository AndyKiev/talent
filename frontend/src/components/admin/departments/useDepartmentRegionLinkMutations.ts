// src/components/admin/departments/useDepartmentRegionLinkMutations.ts
import {
    createDepartmentRegionLink,
    deleteDepartmentRegionLink,
    updateDepartmentRegionLink,
} from './departmentRegionLinkApi';
import { DEPARTMENT_REGION_LINK_QK } from '../../../utils/queryKeys.ts';
import { useCrudMutations, type CrudMutationCallbacks } from '../../../hooks/useCrudMutations';

export function useDepartmentRegionLinkMutations(callbacks: CrudMutationCallbacks) {
    const crud = useCrudMutations({
        queryKey: DEPARTMENT_REGION_LINK_QK,
        createFn: createDepartmentRegionLink,
        updateFn: updateDepartmentRegionLink,
        deleteFn: deleteDepartmentRegionLink,
        ...callbacks,
    });
    return crud;
}
