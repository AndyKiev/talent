// src/components/admin/employee_events/employee_event_statuses/employeeEventStatusApi.ts
import { axiosInstance } from '../../../../api/axiosInstance';
import { BASE_URL } from '../../../../utils/eNums';

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

export interface MutationResponse<T> {
  detail: string;
  data: T;
}

export const fetchEmployeeEventStatuses = async (): Promise<EmployeeEventStatus[]> => {
  const res = await axiosInstance.get<EmployeeEventStatus[]>(BASE);
  return res.data ?? [];
};

export const createEmployeeEventStatus = async (
  body: EmployeeEventStatusCreate,
): Promise<MutationResponse<EmployeeEventStatus>> => {
  const res = await axiosInstance.post<MutationResponse<EmployeeEventStatus>>(BASE, body);
  return res.data;
};

export const updateEmployeeEventStatus = async ({
  id,
  data,
}: {
  id: number;
  data: EmployeeEventStatusUpdate;
}): Promise<MutationResponse<EmployeeEventStatus>> => {
  const res = await axiosInstance.patch<MutationResponse<EmployeeEventStatus>>(`${BASE}/${id}`, data);
  return res.data;
};

export const deleteEmployeeEventStatus = async (id: number): Promise<MutationResponse<null>> => {
  const res = await axiosInstance.delete<MutationResponse<null>>(`${BASE}/${id}`);
  return res.data;
};
