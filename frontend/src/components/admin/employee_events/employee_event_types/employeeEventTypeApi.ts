// src/components/admin/employee_event_types/employeeEventTypeApi.ts
import { axiosInstance } from '../../../../api/axiosInstance.ts';
import { BASE_URL } from '../../../../utils/eNums.ts';

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

export interface MutationResponse<T> {
    detail: string;
    data: T;
}

export const fetchEmployeeEventTypes = async (): Promise<EmployeeEventType[]> => {
    const res = await axiosInstance.get<EmployeeEventType[]>(BASE);
    return res.data ?? [];
};

export const createEmployeeEventType = async (
    body: EmployeeEventTypeCreate,
): Promise<MutationResponse<EmployeeEventType>> => {
    const res = await axiosInstance.post<MutationResponse<EmployeeEventType>>(BASE, body);
    return res.data;
};

export const updateEmployeeEventType = async ({
    id,
    data,
}: {
    id: number;
    data: EmployeeEventTypeUpdate;
}): Promise<MutationResponse<EmployeeEventType>> => {
    const res = await axiosInstance.patch<MutationResponse<EmployeeEventType>>(`${BASE}/${id}`, data);
    return res.data;
};

export const deleteEmployeeEventType = async (id: number): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${BASE}/${id}`);
    return res.data;
};
