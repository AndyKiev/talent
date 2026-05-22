// src/components/admin/employee_events/employee_event_change-dept_types/employeeEventChangeDeptTypeApi.ts
import { axiosInstance } from '../../../../api/axiosInstance';
import { BASE_URL } from '../../../../utils/eNums.ts';

const BASE = `${BASE_URL}/admin/employee_events/employee_event_change_dept_types`;

export interface EmployeeEventChangeDeptType {
    id: number;
    code: string;
    name: string;
}

export interface EmployeeEventChangeDeptTypeCreate {
    code: string;
    name: string;
}

export interface EmployeeEventChangeDeptTypeUpdate {
    name?: string;
}

export interface MutationResponse<T> {
    detail: string;
    data: T;
}

export const fetchEmployeeEventChangeDeptTypes = async (): Promise<EmployeeEventChangeDeptType[]> => {
    const res = await axiosInstance.get<EmployeeEventChangeDeptType[]>(BASE);
    return res.data ?? [];
};

export const createEmployeeEventChangeDeptType = async (
    body: EmployeeEventChangeDeptTypeCreate,
): Promise<MutationResponse<EmployeeEventChangeDeptType>> => {
    const res = await axiosInstance.post<MutationResponse<EmployeeEventChangeDeptType>>(BASE, body);
    return res.data;
};

export const updateEmployeeEventChangeDeptType = async ({
    id,
    data,
}: {
    id: number;
    data: EmployeeEventChangeDeptTypeUpdate;
}): Promise<MutationResponse<EmployeeEventChangeDeptType>> => {
    const res = await axiosInstance.patch<MutationResponse<EmployeeEventChangeDeptType>>(
        `${BASE}/${id}`,
        data,
    );
    return res.data;
};

export const deleteEmployeeEventChangeDeptType = async (
    id: number,
): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${BASE}/${id}`);
    return res.data;
};
