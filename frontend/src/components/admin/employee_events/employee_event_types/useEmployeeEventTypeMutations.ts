// src/components/admin/employee_event_types/useEmployeeEventTypeMutations.ts
import {createEmployeeEventType, deleteEmployeeEventType, updateEmployeeEventType,} from './employeeEventTypeApi.ts';
import { EMPLOYEE_EVENT_TYPE_QK } from "../../../../utils/queryKeys.ts";
import { useCrudMutations, type CrudMutationCallbacks } from '../../../../hooks/useCrudMutations';

export function useEmployeeEventTypeMutations(callbacks: CrudMutationCallbacks) {
    const crud = useCrudMutations({
        queryKey: EMPLOYEE_EVENT_TYPE_QK,
        createFn: createEmployeeEventType,
        updateFn: updateEmployeeEventType,
        deleteFn: deleteEmployeeEventType,
        ...callbacks,
    });
    return crud;
}
