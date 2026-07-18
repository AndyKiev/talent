// src/components/admin/employee_events/employee-event-statuses/useEmployeeEventStatusMutations.ts
import {
  createEmployeeEventStatus,
  deleteEmployeeEventStatus,
  updateEmployeeEventStatus,
} from './employeeEventStatusApi';
import { EMPLOYEE_EVENT_STATUS_QK } from "../../../../utils/queryKeys.ts";
import { useCrudMutations, type CrudMutationCallbacks } from '../../../../hooks/useCrudMutations';

export function useEmployeeEventStatusMutations(callbacks: CrudMutationCallbacks) {
    const crud = useCrudMutations({
        queryKey: EMPLOYEE_EVENT_STATUS_QK,
        createFn: createEmployeeEventStatus,
        updateFn: updateEmployeeEventStatus,
        deleteFn: deleteEmployeeEventStatus,
        ...callbacks,
    });
    return crud;
}
