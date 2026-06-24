// src/components/planning/planningApi.ts
import { axiosInstance } from '../../api/axiosInstance';
import { BASE_URL } from '../../utils/eNums';

const SESSIONS = `${BASE_URL}/admin/plan_sessions`;
const SCOPES = `${BASE_URL}/admin/plan_scopes`;

// ── Shared ──────────────────────────────────────────────────────────────────

export interface MutationResponse<T> {
    detail: string;
    data: T;
}

// ── Plan session status (read-only here; full CRUD lives in admin setup) ──────

export interface PlanSessionStatus {
    id: number;
    key: string;
    name: string;
    description: string | null;
    is_active: boolean;
    created_at: string;
}

// ── Plan session ──────────────────────────────────────────────────────────────

export interface PlanSession {
    id: number;
    name: string;
    description: string | null;
    start_date: string; // ISO date (YYYY-MM-DD)
    end_date: string;
    plan_session_status_id: number;
    is_active: boolean;
    created_at: string;
    status: PlanSessionStatus | null;
}

export interface PlanSessionCreate {
    name: string;
    description?: string | null;
    start_date: string;
    end_date: string;
    department_category_ids?: number[] | null;
}

export interface PlanSessionUpdate {
    name?: string;
    description?: string | null;
    start_date?: string;
    end_date?: string;
}

// ── Plan scope (editable plan rows) ───────────────────────────────────────────

export interface PlanScopeDepartment {
    id: number;
    name: string;
}

export interface PlanScopeJobGroup {
    id: number;
    name: string;
}

export interface PlanScopeTalentStatus {
    id: number;
    key: string;
    name: string;
}

export interface PlanRegion {
    id: number;
    key: string;
    name: string;
    sort_order: number;
}

export interface PlanScope {
    id: number;
    plan_session_id: number;
    department_id: number;
    job_group_id: number;
    talent_status_id: number | null;
    value: number | null;
    is_active: boolean;
    created_at: string;
    department: PlanScopeDepartment | null;
    job_group: PlanScopeJobGroup | null;
    talent_status: PlanScopeTalentStatus | null;
    region: PlanRegion | null;
}

export interface PlanScopeUpdate {
    value: number | null;
}

// ── Sessions API ──────────────────────────────────────────────────────────────

export const fetchPlanSessions = async (): Promise<PlanSession[]> => {
    const res = await axiosInstance.get<PlanSession[]>(SESSIONS);
    return res.data ?? [];
};

export const fetchPlanSessionById = async (id: number): Promise<PlanSession> => {
    const res = await axiosInstance.get<PlanSession>(`${SESSIONS}/${id}`);
    return res.data;
};

export const createPlanSession = async (
    body: PlanSessionCreate,
): Promise<MutationResponse<PlanSession>> => {
    const res = await axiosInstance.post<MutationResponse<PlanSession>>(SESSIONS, body);
    return res.data;
};

export const updatePlanSession = async ({
    id,
    data,
}: {
    id: number;
    data: PlanSessionUpdate;
}): Promise<MutationResponse<PlanSession>> => {
    const res = await axiosInstance.patch<MutationResponse<PlanSession>>(`${SESSIONS}/${id}`, data);
    return res.data;
};

export const openPlanSession = async (id: number): Promise<MutationResponse<PlanSession>> => {
    const res = await axiosInstance.patch<MutationResponse<PlanSession>>(`${SESSIONS}/${id}/open`);
    return res.data;
};

export const closePlanSession = async (id: number): Promise<MutationResponse<PlanSession>> => {
    const res = await axiosInstance.patch<MutationResponse<PlanSession>>(`${SESSIONS}/${id}/close`);
    return res.data;
};

export const revertPlanSession = async (id: number): Promise<MutationResponse<PlanSession>> => {
    const res = await axiosInstance.patch<MutationResponse<PlanSession>>(`${SESSIONS}/${id}/revert`);
    return res.data;
};

export const resyncPlanSession = async (
    id: number,
    addCategoryIds?: number[],
): Promise<MutationResponse<PlanSession>> => {
    const body = addCategoryIds && addCategoryIds.length ? { add_category_ids: addCategoryIds } : {};
    const res = await axiosInstance.patch<MutationResponse<PlanSession>>(
        `${SESSIONS}/${id}/resync`,
        body,
    );
    return res.data;
};

// Re-use the admin ref-category fetch (single source of truth).
export { fetchDepartmentCategoriesRef } from '../admin/planning_setup/planningSetupApi';
export type { RefDepartmentCategory } from '../admin/planning_setup/planningSetupApi';

export const deletePlanSession = async (id: number): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${SESSIONS}/${id}`);
    return res.data;
};

// ── Scopes API ────────────────────────────────────────────────────────────────

export const fetchPlanScopesBySession = async (
    planSessionId: number,
): Promise<PlanScope[]> => {
    const res = await axiosInstance.get<PlanScope[]>(`${SCOPES}/by_session/${planSessionId}`);
    return res.data ?? [];
};

export const updatePlanScope = async ({
    id,
    data,
}: {
    id: number;
    data: PlanScopeUpdate;
}): Promise<MutationResponse<PlanScope>> => {
    const res = await axiosInstance.patch<MutationResponse<PlanScope>>(`${SCOPES}/${id}`, data);
    return res.data;
};

export const deletePlanScope = async (id: number): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${SCOPES}/${id}`);
    return res.data;
};

// ── Plan report (plan vs fact) ────────────────────────────────────────────────

const REPORTS = `${BASE_URL}/admin/plan_reports`;

export interface PlanReportRow {
    plan_scope_id: number;
    department_id: number;
    job_group_id: number;
    talent_status_id: number | null;
    plan: number;
    fact: number;
    department: PlanScopeDepartment | null;
    job_group: PlanScopeJobGroup | null;
    talent_status: PlanScopeTalentStatus | null;
    region: PlanRegion | null;
}

export interface PlanReport {
    plan_session_id: number;
    rows: PlanReportRow[];
}

export const fetchPlanReportBySession = async (
    planSessionId: number,
): Promise<PlanReport> => {
    const res = await axiosInstance.get<PlanReport>(
        `${REPORTS}/by_session/${planSessionId}`,
    );
    return res.data ?? { plan_session_id: planSessionId, rows: [] };
};
