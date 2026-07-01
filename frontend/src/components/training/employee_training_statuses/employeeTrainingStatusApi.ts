// src/components/training/employee_training_statuses/employeeTrainingStatusApi.ts
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums.ts';

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

export interface MutationResponse<T> {
    detail: string;
    data: T;
}

export const fetchEmployeeTrainingStatuses = async (): Promise<EmployeeTrainingStatus[]> => {
    const res = await axiosInstance.get<EmployeeTrainingStatus[]>(BASE);
    return res.data ?? [];
};

export const createEmployeeTrainingStatus = async (
    body: EmployeeTrainingStatusCreate,
): Promise<MutationResponse<EmployeeTrainingStatus>> => {
    const res = await axiosInstance.post<MutationResponse<EmployeeTrainingStatus>>(BASE, body);
    return res.data;
};

export const updateEmployeeTrainingStatus = async ({
    id,
    data,
}: {
    id: number;
    data: EmployeeTrainingStatusUpdate;
}): Promise<MutationResponse<EmployeeTrainingStatus>> => {
    const res = await axiosInstance.patch<MutationResponse<EmployeeTrainingStatus>>(`${BASE}/${id}`, data);
    return res.data;
};

export const deleteEmployeeTrainingStatus = async (id: number): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${BASE}/${id}`);
    return res.data;
};
