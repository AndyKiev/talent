// src/components/admin/hrm_scopes/hrmScopeApi.ts
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums';
import type { MutationResponse } from '../../../types/mutationResponse';
export type { MutationResponse };

const BASE = `${BASE_URL}/admin/hrm_scopes`;

// ── Types ──────────────────────────────────────────────────────────────────

export interface HrmEmployeeRow {
    id: number;
    code: string;
    name: string;
    email: string | null;
    job_name: string | null;
    scope_count: number;
    active_scope_count: number;
}

export interface HrmScope {
    id: number;
    employee_id: number;
    department_id: number;
    start_date: string; // ISO date (YYYY-MM-DD)
    end_date: string;   // ISO date (YYYY-MM-DD)
    created_at: string;
    employee_code: string | null;
    employee_name: string | null;
    department_name: string | null;
    department_category_id: number | null;
    department_category_name: string | null;
    is_currently_active: boolean | null;
}

export interface HrmScopeCreate {
    employee_id: number;
    department_id: number;
    start_date: string; // YYYY-MM-DD
    end_date: string;   // YYYY-MM-DD
}

export interface HrmScopeUpdate {
    department_id?: number;
    start_date?: string;
    end_date?: string;
}

// ── Calls ──────────────────────────────────────────────────────────────────

export const fetchHrmEmployees = async (): Promise<HrmEmployeeRow[]> => {
    const res = await axiosInstance.get<HrmEmployeeRow[]>(`${BASE}/hrm_employees`);
    return res.data ?? [];
};

export const fetchScopesByEmployee = async (employeeId: number): Promise<HrmScope[]> => {
    const res = await axiosInstance.get<HrmScope[]>(`${BASE}/by_employee/${employeeId}`);
    return res.data ?? [];
};

export const createHrmScope = async (
    body: HrmScopeCreate,
): Promise<MutationResponse<HrmScope>> => {
    const res = await axiosInstance.post<MutationResponse<HrmScope>>(BASE, body);
    return res.data;
};

export const updateHrmScope = async (
    id: number,
    body: HrmScopeUpdate,
): Promise<MutationResponse<HrmScope>> => {
    const res = await axiosInstance.patch<MutationResponse<HrmScope>>(`${BASE}/${id}`, body);
    return res.data;
};

export const deleteHrmScope = async (id: number): Promise<void> => {
    await axiosInstance.delete(`${BASE}/${id}`);
};
