// src/components/admin/planning_setup/planningSetupApi.ts
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums';

const STATUSES = `${BASE_URL}/admin/plan_session_statuses`;
const CATEGORY_DEFAULTS = `${BASE_URL}/admin/plan_category_defaults`;
const SCOPE_DEFAULTS = `${BASE_URL}/admin/plan_scope_defaults`;

export interface MutationResponse<T> {
    detail: string;
    data: T;
}

// ── Plan session status ───────────────────────────────────────────────────────

export interface PlanSessionStatus {
    id: number;
    key: string;
    name: string;
    description: string | null;
    is_active: boolean;
    created_at: string;
}

export interface PlanSessionStatusCreate {
    key: string;
    name: string;
    description?: string | null;
}

export interface PlanSessionStatusUpdate {
    key?: string;
    name?: string;
    description?: string | null;
}

export const fetchPlanSessionStatuses = async (): Promise<PlanSessionStatus[]> => {
    const res = await axiosInstance.get<PlanSessionStatus[]>(STATUSES);
    return res.data ?? [];
};

export const createPlanSessionStatus = async (
    body: PlanSessionStatusCreate,
): Promise<MutationResponse<PlanSessionStatus>> => {
    const res = await axiosInstance.post<MutationResponse<PlanSessionStatus>>(STATUSES, body);
    return res.data;
};

export const updatePlanSessionStatus = async ({
    id,
    data,
}: {
    id: number;
    data: PlanSessionStatusUpdate;
}): Promise<MutationResponse<PlanSessionStatus>> => {
    const res = await axiosInstance.patch<MutationResponse<PlanSessionStatus>>(`${STATUSES}/${id}`, data);
    return res.data;
};

export const deletePlanSessionStatus = async (id: number): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${STATUSES}/${id}`);
    return res.data;
};

// ── Nested ref shapes (reused below) ──────────────────────────────────────────

export interface RefDepartmentCategory {
    id: number;
    name: string;
}

export interface RefJobGroup {
    id: number;
    name: string;
}

export interface RefTalentStatus {
    id: number;
    key: string;
    name: string;
}

// ── Plan category default (DPDCS) ─────────────────────────────────────────────

export interface PlanCategoryDefault {
    id: number;
    department_category_id: number;
    created_at: string;
    department_category: RefDepartmentCategory | null;
}

export interface PlanCategoryDefaultCreate {
    department_category_id: number;
}

export const fetchPlanCategoryDefaults = async (): Promise<PlanCategoryDefault[]> => {
    const res = await axiosInstance.get<PlanCategoryDefault[]>(CATEGORY_DEFAULTS);
    return res.data ?? [];
};

export const createPlanCategoryDefault = async (
    body: PlanCategoryDefaultCreate,
): Promise<MutationResponse<PlanCategoryDefault>> => {
    const res = await axiosInstance.post<MutationResponse<PlanCategoryDefault>>(CATEGORY_DEFAULTS, body);
    return res.data;
};

export const deletePlanCategoryDefault = async (id: number): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${CATEGORY_DEFAULTS}/${id}`);
    return res.data;
};

// ── Plan scope default (DPDJTSS) ──────────────────────────────────────────────

export interface PlanScopeDefault {
    id: number;
    job_group_id: number;
    talent_status_id: number | null;
    created_at: string;
    job_group: RefJobGroup | null;
    talent_status: RefTalentStatus | null;
}

export interface PlanScopeDefaultCreate {
    job_group_id: number;
    talent_status_id: number | null;
}

export const fetchPlanScopeDefaults = async (): Promise<PlanScopeDefault[]> => {
    const res = await axiosInstance.get<PlanScopeDefault[]>(SCOPE_DEFAULTS);
    return res.data ?? [];
};

export const createPlanScopeDefault = async (
    body: PlanScopeDefaultCreate,
): Promise<MutationResponse<PlanScopeDefault>> => {
    const res = await axiosInstance.post<MutationResponse<PlanScopeDefault>>(SCOPE_DEFAULTS, body);
    return res.data;
};

export const deletePlanScopeDefault = async (id: number): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${SCOPE_DEFAULTS}/${id}`);
    return res.data;
};

// ── Lookups for selects ───────────────────────────────────────────────────────

export const fetchDepartmentCategoriesRef = async (): Promise<RefDepartmentCategory[]> => {
    const res = await axiosInstance.get<RefDepartmentCategory[]>(
        `${BASE_URL}/admin/department_categories`,
    );
    return res.data ?? [];
};

export const fetchJobGroupsRef = async (): Promise<RefJobGroup[]> => {
    // Job groups router is mounted at /job_groups (no /admin prefix)
    const res = await axiosInstance.get<RefJobGroup[]>(`${BASE_URL}/job_groups`);
    return res.data ?? [];
};

export const fetchTalentStatusesRef = async (): Promise<RefTalentStatus[]> => {
    const res = await axiosInstance.get<RefTalentStatus[]>(`${BASE_URL}/admin/talent_statuses`);
    return res.data ?? [];
};
