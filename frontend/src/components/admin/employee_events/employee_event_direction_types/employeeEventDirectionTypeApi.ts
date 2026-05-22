// src/components/admin/employee_events/employee_event_direction_types/employeeEventDirectionTypeApi.ts
import { axiosInstance } from '../../../../api/axiosInstance';
import { BASE_URL } from '../../../../utils/eNums.ts';

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

export interface MutationResponse<T> {
    detail: string;
    data: T;
}

export const fetchEmployeeEventDirectionTypes = async (): Promise<EmployeeEventDirectionType[]> => {
    const res = await axiosInstance.get<EmployeeEventDirectionType[]>(BASE);
    return res.data ?? [];
};

export const createEmployeeEventDirectionType = async (
    body: EmployeeEventDirectionTypeCreate,
): Promise<MutationResponse<EmployeeEventDirectionType>> => {
    const res = await axiosInstance.post<MutationResponse<EmployeeEventDirectionType>>(BASE, body);
    return res.data;
};

export const updateEmployeeEventDirectionType = async ({
    id,
    data,
}: {
    id: number;
    data: EmployeeEventDirectionTypeUpdate;
}): Promise<MutationResponse<EmployeeEventDirectionType>> => {
    const res = await axiosInstance.patch<MutationResponse<EmployeeEventDirectionType>>(
        `${BASE}/${id}`,
        data,
    );
    return res.data;
};

export const deleteEmployeeEventDirectionType = async (
    id: number,
): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${BASE}/${id}`);
    return res.data;
};
