// src/components/admin/job_categories/jobCategoryApi.ts
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums.ts';

const BASE = `${BASE_URL}/job_categories`;

export interface JobCategory {
    id: number;
    key: string;
    description: string | null;
    sort_order: number;
    created_at: string;
}

export interface JobCategoryCreate {
    key: string;
    description?: string | null;
    sort_order?: number;
}

export interface JobCategoryUpdate {
    key?: string;
    description?: string | null;
    sort_order?: number;
}

export interface MutationResponse<T> {
    detail: string;
    data: T;
}

export const fetchJobCategories = async (): Promise<JobCategory[]> => {
    const res = await axiosInstance.get<JobCategory[]>(BASE);
    return res.data ?? [];
};

export const createJobCategory = async (
    body: JobCategoryCreate,
): Promise<MutationResponse<JobCategory>> => {
    const res = await axiosInstance.post<MutationResponse<JobCategory>>(BASE, body);
    return res.data;
};

export const updateJobCategory = async ({
    id,
    data,
}: {
    id: number;
    data: JobCategoryUpdate;
}): Promise<MutationResponse<JobCategory>> => {
    const res = await axiosInstance.patch<MutationResponse<JobCategory>>(`${BASE}/${id}`, data);
    return res.data;
};

export const deleteJobCategory = async (id: number): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${BASE}/${id}`);
    return res.data;
};

// ── Bulk clear (deliberate): remove the category link from every job ──────────
export interface JobCategoryClearAllResult {
    detail: string;
    deleted_count: number;
}

export const clearAllJobCategoryLinks = async (): Promise<JobCategoryClearAllResult> => {
    const res = await axiosInstance.delete<JobCategoryClearAllResult>(
        `${BASE_URL}/job_job_category_links/all`,
    );
    return res.data;
};
