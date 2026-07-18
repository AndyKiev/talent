// src/components/admin/users/employeeUserGroupApi.ts
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums';
import type { MutationResponse } from '../../../types/mutationResponse';
export type { MutationResponse };

const BASE = `${BASE_URL}/admin/employee_user_group_links`;

// ── Types ──────────────────────────────────────────────────────────────────

export interface GroupOfType {
    link_id: number;
    group_id: number;
    group_name: string;
    user_group_type_id: number;
    user_group_type_name: string | null;
}

export interface EmployeeWithGroups {
    id: number;
    code: string;
    name: string;
    email: string | null;
    job_name: string | null;
    groups: GroupOfType[];
}

export interface EmployeeUserGroupLink {
    id: number;
    employee_id: number;
    user_group_id: number;
    created_at: string;
}

export interface EmployeeUserGroupLinkCreate {
    employee_id: number;
    user_group_id: number;
}

// ── Calls ──────────────────────────────────────────────────────────────────

export const fetchEmployeesWithGroups = async (): Promise<EmployeeWithGroups[]> => {
    const res = await axiosInstance.get<EmployeeWithGroups[]>(`${BASE}/employees_with_groups`);
    return res.data ?? [];
};

export const createEmployeeUserGroupLink = async (
    body: EmployeeUserGroupLinkCreate,
): Promise<MutationResponse<EmployeeUserGroupLink>> => {
    const res = await axiosInstance.post<MutationResponse<EmployeeUserGroupLink>>(BASE, body);
    return res.data;
};

// DELETE → 200, no meaningful body
export const deleteEmployeeUserGroupLink = async (linkId: number): Promise<void> => {
    await axiosInstance.delete(`${BASE}/${linkId}`);
};

export interface LinkDeletionPreview {
    group_name: string;
    hrm_scope_count: number;
}

// What removing this link will cascade-delete (HRM scopes), for reconfirmation.
export const fetchLinkDeletionPreview = async (
    linkId: number,
): Promise<LinkDeletionPreview> => {
    const res = await axiosInstance.get<LinkDeletionPreview>(
        `${BASE}/${linkId}/deletion_preview`,
    );
    return res.data;
};
