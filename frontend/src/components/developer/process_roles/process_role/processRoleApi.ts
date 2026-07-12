// src/components/developer/process_roles/process_role/processRoleApi.ts
import { axiosInstance } from '../../../../api/axiosInstance';
import { BASE_URL } from '../../../../utils/eNums.ts';

const BASE = `${BASE_URL}/admin/process_roles`;

export type LinkTarget = 'employee' | 'department';

export interface ProcessRole {
    id: number;
    process_id: number;
    name: string;
    short_name: string | null;
    key: string | null;
    is_active: boolean;
    created_at: string;
    process_name: string | null;
    link_target: LinkTarget;
}

export interface ProcessRoleCreate {
    process_id: number;
    name: string;
    short_name?: string | null;
    key?: string | null;
    is_active: boolean;
    link_target: LinkTarget;
}

export interface ProcessRoleUpdate {
    name?: string;
    short_name?: string | null;
    key?: string | null;
    is_active?: boolean;
    link_target?: LinkTarget;
}

export interface MutationResponse<T> {
    detail: string;
    data: T;
}

export const fetchProcessRoles = async (
    params?: { process_id?: number; is_active?: boolean },
): Promise<ProcessRole[]> => {
    const res = await axiosInstance.get<ProcessRole[]>(BASE, { params });
    return res.data ?? [];
};

export const createProcessRole = async (
    body: ProcessRoleCreate,
): Promise<MutationResponse<ProcessRole>> => {
    const res = await axiosInstance.post<MutationResponse<ProcessRole>>(BASE, body);
    return res.data;
};

export const updateProcessRole = async ({
    id,
    data,
}: {
    id: number;
    data: ProcessRoleUpdate;
}): Promise<MutationResponse<ProcessRole>> => {
    const res = await axiosInstance.patch<MutationResponse<ProcessRole>>(`${BASE}/${id}`, data);
    return res.data;
};

export const deleteProcessRole = async (id: number): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${BASE}/${id}`);
    return res.data;
};
