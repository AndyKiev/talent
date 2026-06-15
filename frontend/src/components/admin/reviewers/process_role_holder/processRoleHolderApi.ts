// src/components/admin/reviewers/process_role_holder/processRoleHolderApi.ts
import { axiosInstance } from '../../../../api/axiosInstance';
import { BASE_URL } from '../../../../utils/eNums.ts';

const BASE = `${BASE_URL}/admin/process_role_holders`;

export interface ProcessRoleHolder {
    id: number;
    process_role_id: number;
    holder_employee_id: number;
    assigned_by: number;
    created_at: string;
    holder_code: string | null;
    holder_name: string | null;
    assigner_name: string | null;
    role_name: string | null;
}

export interface ProcessRoleHolderCreate {
    process_role_id: number;
    holder_employee_id: number;
}

export interface MutationResponse<T> {
    detail: string;
    data: T;
}

export const fetchProcessRoleHolders = async (
    params?: { process_role_id?: number; holder_employee_id?: number },
): Promise<ProcessRoleHolder[]> => {
    const res = await axiosInstance.get<ProcessRoleHolder[]>(BASE, { params });
    return res.data ?? [];
};

export const createProcessRoleHolder = async (
    body: ProcessRoleHolderCreate,
): Promise<MutationResponse<ProcessRoleHolder>> => {
    const res = await axiosInstance.post<MutationResponse<ProcessRoleHolder>>(BASE, body);
    return res.data;
};

export const deleteProcessRoleHolder = async (id: number): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${BASE}/${id}`);
    return res.data;
};
