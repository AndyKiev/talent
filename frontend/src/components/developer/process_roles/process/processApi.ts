// src/components/developer/process_roles/process/processApi.ts
import { axiosInstance } from '../../../../api/axiosInstance';
import { BASE_URL } from '../../../../utils/eNums.ts';

const BASE = `${BASE_URL}/admin/processes`;

export interface Process {
    id: number;
    name: string;
    key: string | null;
    is_active: boolean;
    created_at: string;
}

export interface ProcessCreate {
    name: string;
    key?: string | null;
    is_active: boolean;
}

export interface ProcessUpdate {
    name?: string;
    key?: string | null;
    is_active?: boolean;
}

export interface MutationResponse<T> {
    detail: string;
    data: T;
}

export const fetchProcesses = async (
    params?: { is_active?: boolean },
): Promise<Process[]> => {
    const res = await axiosInstance.get<Process[]>(BASE, { params });
    return res.data ?? [];
};

export const createProcess = async (
    body: ProcessCreate,
): Promise<MutationResponse<Process>> => {
    const res = await axiosInstance.post<MutationResponse<Process>>(BASE, body);
    return res.data;
};

export const updateProcess = async ({
    id,
    data,
}: {
    id: number;
    data: ProcessUpdate;
}): Promise<MutationResponse<Process>> => {
    const res = await axiosInstance.patch<MutationResponse<Process>>(`${BASE}/${id}`, data);
    return res.data;
};

export const deleteProcess = async (id: number): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${BASE}/${id}`);
    return res.data;
};
