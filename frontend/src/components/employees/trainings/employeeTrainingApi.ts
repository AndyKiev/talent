// src/components/employees/trainings/employeeTrainingApi.ts
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums.ts';
import type { MutationResponse } from '../../../types/mutationResponse';
export type { MutationResponse };

const BASE = `${BASE_URL}/employee_trainings`;

export interface EmployeeTraining {
    id: number;
    employee_id: number;
    training_type_id: number;
    training_status_id: number;
    created_at: string;
    training_type_name: string | null;
    training_status_key: string | null;
}

export interface EmployeeTrainingCreate {
    employee_id: number;
    training_type_id: number;
    training_status_id: number;
}

export interface EmployeeTrainingUpdate {
    training_status_id: number;
}

export const fetchEmployeeTrainings = async (employeeId: number): Promise<EmployeeTraining[]> => {
    const res = await axiosInstance.get<EmployeeTraining[]>(`${BASE}/employee/${employeeId}`);
    return res.data ?? [];
};

export const createEmployeeTraining = async (
    body: EmployeeTrainingCreate,
): Promise<MutationResponse<EmployeeTraining>> => {
    const res = await axiosInstance.post<MutationResponse<EmployeeTraining>>(BASE, body);
    return res.data;
};

export const updateEmployeeTraining = async ({
    id,
    data,
}: {
    id: number;
    data: EmployeeTrainingUpdate;
}): Promise<MutationResponse<EmployeeTraining>> => {
    const res = await axiosInstance.patch<MutationResponse<EmployeeTraining>>(`${BASE}/${id}`, data);
    return res.data;
};

export const deleteEmployeeTraining = async (id: number): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${BASE}/${id}`);
    return res.data;
};
