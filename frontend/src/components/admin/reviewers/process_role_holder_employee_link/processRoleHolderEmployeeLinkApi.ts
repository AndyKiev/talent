// src/components/admin/reviewers/process_role_holder_employee_link/processRoleHolderEmployeeLinkApi.ts
import { axiosInstance } from '../../../../api/axiosInstance';
import { BASE_URL } from '../../../../utils/eNums.ts';
import type { MutationResponse } from '../../../../types/mutationResponse';
export type { MutationResponse };

const BASE = `${BASE_URL}/admin/process_role_holder_employees`;

export interface ProcessRoleHolderEmployeeLink {
    id: number;
    process_role_holder_id: number;
    employee_id: number;
    process_role_id: number;
    created_at: string;
    employee_code: string | null;
    employee_name: string | null;
    order_position: number | null;
}

export interface ProcessRoleHolderEmployeeLinkCreate {
    process_role_holder_id: number;
    employee_id: number;
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

/**
 * Persist the roster presentation order for one holder. Sends the full top-to-
 * bottom link id order; the server assigns positions 10, 20, 30 …
 */
export const reorderProcessRoleHolderEmployeeLinks = async (
    processRoleHolderId: number,
    orderedIds: number[],
): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.post<MutationResponse<null>>(`${BASE}/reorder`, {
        process_role_holder_id: processRoleHolderId,
        ordered_ids: orderedIds,
    });
    return res.data;
};
