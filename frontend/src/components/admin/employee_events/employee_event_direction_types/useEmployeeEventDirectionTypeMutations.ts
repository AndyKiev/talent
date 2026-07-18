// src/components/admin/employee_events/employee_event_direction_types/useEmployeeEventDirectionTypeMutations.ts
import {
    createEmployeeEventDirectionType,
    deleteEmployeeEventDirectionType,
    updateEmployeeEventDirectionType,
} from './employeeEventDirectionTypeApi';
import { EMPLOYEE_EVENT_DIRECTION_TYPE_QK } from "../../../../utils/queryKeys.ts";
import { useCrudMutations, type CrudMutationCallbacks } from '../../../../hooks/useCrudMutations';

export function useEmployeeEventDirectionTypeMutations(callbacks: CrudMutationCallbacks) {
    const crud = useCrudMutations({
        queryKey: EMPLOYEE_EVENT_DIRECTION_TYPE_QK,
        createFn: createEmployeeEventDirectionType,
        updateFn: updateEmployeeEventDirectionType,
        deleteFn: deleteEmployeeEventDirectionType,
        ...callbacks,
    });
    return crud;
}
