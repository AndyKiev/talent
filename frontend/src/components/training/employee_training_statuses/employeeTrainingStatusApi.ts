// src/components/training/employee_training_statuses/employeeTrainingStatusApi.ts
import { BASE_URL } from '../../../utils/eNums.ts';
import type { MutationResponse } from '../../../types/mutationResponse';
export type { MutationResponse };
import { createCrudApi } from '../../../api/createCrudApi';

const BASE = `${BASE_URL}/employee_training_statuses`;

export interface EmployeeTrainingStatus {
    id: number;
    key: string;
    description: string | null;
    sort_order: number;
    created_at: string;
}

export interface EmployeeTrainingStatusCreate {
    key: string;
    description?: string | null;
}

export interface EmployeeTrainingStatusUpdate {
    key?: string;
    description?: string | null;
    sort_order?: number;
}

const crud = createCrudApi<EmployeeTrainingStatus, EmployeeTrainingStatusCreate, EmployeeTrainingStatusUpdate>(BASE);

export const fetchEmployeeTrainingStatuses = crud.fetchList;

export const createEmployeeTrainingStatus = crud.create;

export const updateEmployeeTrainingStatus = crud.update;

export const deleteEmployeeTrainingStatus = crud.remove;
