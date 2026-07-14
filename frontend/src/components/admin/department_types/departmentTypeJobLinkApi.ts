// src/components/admin/department_types/departmentTypeJobLinkApi.ts
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums';

const BASE = `${BASE_URL}/department_type_job_links`;

export interface DepartmentTypeJobLink {
    id: number;
    department_type_id: number;
    job_id: number;
    is_active: boolean;
    created_at: string;
}

export interface JobWithLinkId {
    id: number;
    name: string;
    description: string | null;
    is_active: boolean;
    created_at: string;
    groups: string[];
    link_id: number;
    link_is_active: boolean;
}

export interface DepartmentTypeJobLinkCreate {
    department_type_id: number;
    job_id: number;
    is_active?: boolean;
}

export interface DepartmentTypeJobLinkUpdate {
    is_active: boolean;
}

export interface MutationResponse<T> {
    detail: string;
    data: T;
}

/**
 * Fetch ALL department_type ↔ job links, optionally filtered by is_active.
 * Lightweight (link rows only) — used to determine which department types
 * have at least one job linked.
 */
export const fetchDepartmentTypeJobLinks = async (
    isActive?: boolean,
): Promise<DepartmentTypeJobLink[]> => {
    const params: Record<string, string> = {};
    if (isActive !== undefined) params.is_active = String(isActive);
    const res = await axiosInstance.get<DepartmentTypeJobLink[]>(BASE, { params });
    return res.data ?? [];
};

/** Fetch all jobs linked to a department type (active only by default) */
export const fetchJobsByDepartmentType = async (
    departmentTypeId: number,
    isActive?: boolean,
): Promise<JobWithLinkId[]> => {
    const params: Record<string, string> = {};
    if (isActive !== undefined) params.is_active = String(isActive);
    const res = await axiosInstance.get<JobWithLinkId[]>(
        `${BASE}/by_department_type/${departmentTypeId}/jobs`,
        { params },
    );
    return res.data ?? [];
};

/** Create a new department_type ↔ job link */
export const createDepartmentTypeJobLink = async (
    body: DepartmentTypeJobLinkCreate,
): Promise<MutationResponse<DepartmentTypeJobLink>> => {
    const res = await axiosInstance.post<MutationResponse<DepartmentTypeJobLink>>(BASE, body);
    return res.data;
};

/** Toggle is_active on an existing link */
export const updateDepartmentTypeJobLink = async ({
    linkId,
    data,
}: {
    linkId: number;
    data: DepartmentTypeJobLinkUpdate;
}): Promise<MutationResponse<DepartmentTypeJobLink>> => {
    const res = await axiosInstance.patch<MutationResponse<DepartmentTypeJobLink>>(
        `${BASE}/${linkId}`,
        data,
    );
    return res.data;
};

export interface DepartmentTypeJobLinkBulkSyncResult {
    created: number;
    removed: number;
}

/**
 * Batch apply (linking board): the type's links become EXACTLY job_ids —
 * missing links are created (active), links absent from the list are deleted.
 */
export const bulkSyncDepartmentTypeJobLinks = async (
    departmentTypeId: number,
    jobIds: number[],
): Promise<MutationResponse<DepartmentTypeJobLinkBulkSyncResult>> => {
    const res = await axiosInstance.post<
        MutationResponse<DepartmentTypeJobLinkBulkSyncResult>
    >(`${BASE}/bulk_sync`, {
        department_type_id: departmentTypeId,
        job_ids: jobIds,
    });
    return res.data;
};

/** Delete a link by its ID */
export const deleteDepartmentTypeJobLink = async (
    linkId: number,
): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${BASE}/${linkId}`);
    return res.data;
};
