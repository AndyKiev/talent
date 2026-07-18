// src/components/admin/department_types/useDepartmentTypeMutations.ts
import {createDepartmentType, deleteDepartmentType, updateDepartmentType,} from './departmentTypeApi';
import { DEPARTMENT_TYPE_QK } from "../../../utils/queryKeys.ts";
import { useCrudMutations, type CrudMutationCallbacks } from '../../../hooks/useCrudMutations';

export function useDepartmentTypeMutations(callbacks: CrudMutationCallbacks) {
    const crud = useCrudMutations({
        queryKey: DEPARTMENT_TYPE_QK,
        createFn: createDepartmentType,
        updateFn: updateDepartmentType,
        deleteFn: deleteDepartmentType,
        ...callbacks,
    });
    return crud;
}
