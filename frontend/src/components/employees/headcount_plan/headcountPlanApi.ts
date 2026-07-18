// src/components/employees/headcount_plan/headcountPlanApi.ts
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums';
import type { MutationResponse } from '../../../types/mutationResponse';
export type { MutationResponse };

const BASE = `${BASE_URL}/department_job_targets`;

export interface DepartmentJobTarget {
    id: number;
    department_id: number;
    department_type_job_link_id: number;
    qty: number;
    effective_date: string; // ISO YYYY-MM-DD
    created_at: string;
    created_by: number | null;
    created_by_name: string | null;
}

export interface DepartmentJobTargetUpdate {
    qty: number;
    effective_date: string; // ISO YYYY-MM-DD
}

export interface FactEmployee {
    id: number;
    code: string;
    name: string;
    // True when this placement depends on a ready (not-yet-applied) event.
    is_pending: boolean;
}

export interface DepartmentJobTargetCreate {
    department_id: number;
    department_type_job_link_id: number;
    qty: number;
    effective_date: string; // ISO YYYY-MM-DD
}

export interface HeadcountCalcRow {
    link_id: number;
    job_id: number;
    job_name: string;
    link_is_active: boolean;
    plan_qty: number;
    has_plan: boolean;
    fact_qty: number;
    // Of fact_qty, how many rest on a not-yet-applied (ready) event.
    fact_pending_qty: number;
}

export interface TargetCountByLink {
    count: number;
}

export const fetchHeadcountCalc = async (
    departmentId: number,
    isoDate: string,
): Promise<HeadcountCalcRow[]> => {
    const res = await axiosInstance.get<HeadcountCalcRow[]>(`${BASE}/calculate`, {
        params: { department_id: departmentId, on_date: isoDate },
    });
    return res.data ?? [];
};

export const fetchHeadcountTargets = async (
    departmentId: number,
    linkId: number,
): Promise<DepartmentJobTarget[]> => {
    const res = await axiosInstance.get<DepartmentJobTarget[]>(BASE, {
        params: { department_id: departmentId, department_type_job_link_id: linkId },
    });
    return res.data ?? [];
};

export const createHeadcountTarget = async (
    body: DepartmentJobTargetCreate,
): Promise<MutationResponse<DepartmentJobTarget>> => {
    const res = await axiosInstance.post<MutationResponse<DepartmentJobTarget>>(BASE, body);
    return res.data;
};

export const updateHeadcountTarget = async ({
    targetId,
    data,
}: {
    targetId: number;
    data: DepartmentJobTargetUpdate;
}): Promise<MutationResponse<DepartmentJobTarget>> => {
    const res = await axiosInstance.patch<MutationResponse<DepartmentJobTarget>>(
        `${BASE}/${targetId}`,
        data,
    );
    return res.data;
};

export const fetchFactEmployees = async (
    departmentId: number,
    isoDate: string,
    jobId: number,
): Promise<FactEmployee[]> => {
    const res = await axiosInstance.get<FactEmployee[]>(`${BASE}/fact_employees`, {
        params: { department_id: departmentId, on_date: isoDate, job_id: jobId },
    });
    return res.data ?? [];
};

export const deleteHeadcountTarget = async (targetId: number): Promise<string> => {
    // Backend answers 200 with a translated success detail.
    const res = await axiosInstance.delete<{ detail: string }>(`${BASE}/${targetId}`);
    return res.data?.detail ?? '';
};

export const fetchTargetCountByLink = async (
    linkId: number,
): Promise<TargetCountByLink> => {
    const res = await axiosInstance.get<TargetCountByLink>(
        `${BASE}/count_by_link/${linkId}`,
    );
    return res.data ?? { count: 0 };
};
