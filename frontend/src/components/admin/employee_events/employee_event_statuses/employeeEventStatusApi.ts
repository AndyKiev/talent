// src/components/admin/employee_events/employee_event_statuses/employeeEventStatusApi.ts
import { BASE_URL } from '../../../../utils/eNums';
import type { MutationResponse } from '../../../../types/mutationResponse';
export type { MutationResponse };
import { createCrudApi } from '../../../../api/createCrudApi';

const BASE = `${BASE_URL}/admin/employee_events/employee_event_statuses`;

export interface EmployeeEventStatus {
  id: number;
  name: string;
  description: string | null;
}

export interface EmployeeEventStatusCreate {
  name: string;
  description?: string | null;
}

export interface EmployeeEventStatusUpdate {
  name?: string;
  description?: string | null;
}

const crud = createCrudApi<EmployeeEventStatus, EmployeeEventStatusCreate, EmployeeEventStatusUpdate>(BASE);

export const fetchEmployeeEventStatuses = crud.fetchList;

export const createEmployeeEventStatus = crud.create;

export const updateEmployeeEventStatus = crud.update;

export const deleteEmployeeEventStatus = crud.remove;
