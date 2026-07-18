// src/components/admin/job_categories/jobCategoryApi.ts
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums.ts';
import type { MutationResponse } from '../../../types/mutationResponse';
export type { MutationResponse };
import { createCrudApi } from '../../../api/createCrudApi';

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

const crud = createCrudApi<JobCategory, JobCategoryCreate, JobCategoryUpdate>(BASE);

export const fetchJobCategories = crud.fetchList;

export const createJobCategory = crud.create;

export const updateJobCategory = crud.update;

export const deleteJobCategory = crud.remove;

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
