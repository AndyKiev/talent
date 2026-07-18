// src/components/training/employee_training_statuses/useEmployeeTrainingStatusMutations.ts
import {
    createEmployeeTrainingStatus,
    deleteEmployeeTrainingStatus,
    updateEmployeeTrainingStatus,
} from './employeeTrainingStatusApi';
import { EMPLOYEE_TRAINING_STATUS_QK } from '../../../utils/queryKeys.ts';
import { useCrudMutations, type CrudMutationCallbacks } from '../../../hooks/useCrudMutations';

export function useEmployeeTrainingStatusMutations(callbacks: CrudMutationCallbacks) {
    const crud = useCrudMutations({
        queryKey: EMPLOYEE_TRAINING_STATUS_QK,
        createFn: createEmployeeTrainingStatus,
        updateFn: updateEmployeeTrainingStatus,
        deleteFn: deleteEmployeeTrainingStatus,
        ...callbacks,
    });
    return crud;
}
