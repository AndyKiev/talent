// src/components/admin/department_categories/useDepartmentCategoryMutations.ts
import {createDepartmentCategory, deleteDepartmentCategory, updateDepartmentCategory,} from './departmentCategoryApi';
import { DEPARTMENT_CATEGORY_QK } from "../../../utils/queryKeys.ts";
import { useCrudMutations, type CrudMutationCallbacks } from '../../../hooks/useCrudMutations';

export function useDepartmentCategoryMutations(callbacks: CrudMutationCallbacks) {
    const crud = useCrudMutations({
        queryKey: DEPARTMENT_CATEGORY_QK,
        createFn: createDepartmentCategory,
        updateFn: updateDepartmentCategory,
        deleteFn: deleteDepartmentCategory,
        ...callbacks,
    });
    return crud;
}
