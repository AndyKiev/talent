// src/components/admin/reviewers/process_role_holder_department_link/processRoleHolderDepartmentLinkApi.ts
import { axiosInstance } from '../../../../api/axiosInstance';
import { BASE_URL } from '../../../../utils/eNums.ts';

const BASE = `${BASE_URL}/admin/process_role_holder_departments`;

export interface ProcessRoleHolderDepartmentLink {
    id: number;
    process_role_holder_id: number;
    department_id: number;
    process_role_id: number;
    created_at: string;
    department_name: string | null;
}

export interface ProcessRoleHolderDepartmentLinkCreate {
    process_role_holder_id: number;
    department_id: number;
}

export interface MutationResponse<T> {
    detail: string;
    data: T;
}

export const fetchProcessRoleHolderDepartmentLinks = async (
    params?: { process_role_holder_id?: number; process_role_id?: number; department_id?: number },
): Promise<ProcessRoleHolderDepartmentLink[]> => {
    const res = await axiosInstance.get<ProcessRoleHolderDepartmentLink[]>(BASE, { params });
    return res.data ?? [];
};

export const createProcessRoleHolderDepartmentLink = async (
    body: ProcessRoleHolderDepartmentLinkCreate,
): Promise<MutationResponse<ProcessRoleHolderDepartmentLink>> => {
    const res = await axiosInstance.post<MutationResponse<ProcessRoleHolderDepartmentLink>>(BASE, body);
    return res.data;
};

export const deleteProcessRoleHolderDepartmentLink = async (
    id: number,
): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${BASE}/${id}`);
    return res.data;
};
