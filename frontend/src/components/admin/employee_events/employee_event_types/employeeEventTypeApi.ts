// src/components/admin/employee_event_types/employeeEventTypeApi.ts
import { BASE_URL } from '../../../../utils/eNums.ts';
import type { MutationResponse } from '../../../../types/mutationResponse';
export type { MutationResponse };
import { createCrudApi } from '../../../../api/createCrudApi';

const BASE = `${BASE_URL}/admin/employee_events/employee_event_types`;

export interface EmployeeEventType {
    id: number;
    code: string;
    name: string;
    description: string | null;
    created_at: string;
}

export interface EmployeeEventTypeCreate {
    code: string;
    name: string;
    description?: string | null;
}

export interface EmployeeEventTypeUpdate {
    code?: string;
    name?: string;
    description?: string | null;
}

const crud = createCrudApi<EmployeeEventType, EmployeeEventTypeCreate, EmployeeEventTypeUpdate>(BASE);

export const fetchEmployeeEventTypes = crud.fetchList;

export const createEmployeeEventType = crud.create;

export const updateEmployeeEventType = crud.update;

export const deleteEmployeeEventType = crud.remove;
