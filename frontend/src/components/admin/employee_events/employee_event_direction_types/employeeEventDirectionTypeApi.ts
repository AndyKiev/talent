// src/components/admin/employee_events/employee_event_direction_types/employeeEventDirectionTypeApi.ts
import { BASE_URL } from '../../../../utils/eNums.ts';
import type { MutationResponse } from '../../../../types/mutationResponse';
export type { MutationResponse };
import { createCrudApi } from '../../../../api/createCrudApi';

const BASE = `${BASE_URL}/admin/employee_events/employee_event_direction_types`;

export interface EmployeeEventDirectionType {
    id: number;
    code: string;
    name: string;
}

export interface EmployeeEventDirectionTypeCreate {
    code: string;
    name: string;
}

export interface EmployeeEventDirectionTypeUpdate {
    name?: string;
}

const crud = createCrudApi<EmployeeEventDirectionType, EmployeeEventDirectionTypeCreate, EmployeeEventDirectionTypeUpdate>(BASE);

export const fetchEmployeeEventDirectionTypes = crud.fetchList;

export const createEmployeeEventDirectionType = crud.create;

export const updateEmployeeEventDirectionType = crud.update;

export const deleteEmployeeEventDirectionType = crud.remove;
