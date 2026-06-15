// src/components/admin/reviewers/process_role_holder_employee_link/processRoleHolderEmployeeLinkApi.ts
import { axiosInstance } from '../../../../api/axiosInstance';
import { BASE_URL } from '../../../../utils/eNums.ts';

const BASE = `${BASE_URL}/admin/process_role_holder_employees`;

export interface ProcessRoleHolderEmployeeLink {
    id: number;
    process_role_holder_id: number;
    employee_id: number;
    process_role_id: number;
    created_at: string;
    employee_code: string | null;
    employee_name: string | null;
}

export interface ProcessRoleHolderEmployeeLinkCreate {
    process_role_holder_id: number;
    employee_id: number;
}

export interface MutationResponse<T> {
    detail: string;
    data: T;
}

export const fetchProcessRoleHolderEmployeeLinks = async (
    params?: { process_role_holder_id?: number; process_role_id?: number; employee_id?: number },
): Promise<ProcessRoleHolderEmployeeLink[]> => {
    const res = await axiosInstance.get<ProcessRoleHolderEmployeeLink[]>(BASE, { params });
    return res.data ?? [];
};

export const createProcessRoleHolderEmployeeLink = async (
    body: ProcessRoleHolderEmployeeLinkCreate,
): Promise<MutationResponse<ProcessRoleHolderEmployeeLink>> => {
    const res = await axiosInstance.post<MutationResponse<ProcessRoleHolderEmployeeLink>>(BASE, body);
    return res.data;
};

export const deleteProcessRoleHolderEmployeeLink = async (
    id: number,
): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${BASE}/${id}`);
    return res.data;
};
