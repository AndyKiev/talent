import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums.ts';

const DIMENSION_BASE = `${BASE_URL}/recruitment_dimensions`;
const GROUP_BASE = `${BASE_URL}/job_requirement_groups`;
const ITEM_BASE = `${BASE_URL}/job_requirement_items`;

export interface RecruitmentDimension {
    id: number;
    name: string;
    key: string;
    description: string | null;
    is_active: boolean;
    color: string;
    sort_order: number;
}

export interface JobRequirementItemMini {
    id: number;
    dimension_id: number;
    text: string;
    sort_order: number;
}

export interface JobRequirementGroup {
    id: number;
    job_id: number;
    name: string;
    is_active: boolean;
    created_by: number;
    created_at: string;
    items: JobRequirementItemMini[];
}

export interface RecruitmentDimensionMini {
    id: number;
    name: string;
    color: string;
    sort_order: number;
}

export interface JobRequirementItem {
    id: number;
    group_id: number;
    dimension_id: number;
    text: string;
    sort_order: number;
    dimension: RecruitmentDimensionMini | null;
}

export interface MutationResponse<T> {
    detail: string;
    data: T;
}

// ── Dimensions (read for the manager; full CRUD lives in the admin slice) ──
export const fetchActiveRecruitmentDimensions = async (): Promise<RecruitmentDimension[]> => {
    const res = await axiosInstance.get<RecruitmentDimension[]>(DIMENSION_BASE, {
        params: { is_active: true },
    });
    return res.data ?? [];
};

// ── Requirement groups ─────────────────────────────────────────────────────
export const fetchJobRequirementGroups = async (jobId: number): Promise<JobRequirementGroup[]> => {
    const res = await axiosInstance.get<JobRequirementGroup[]>(GROUP_BASE, {
        params: { job_id: jobId },
    });
    return res.data ?? [];
};

export interface JobRequirementGroupCreate {
    job_id: number;
    name: string;
    is_active: boolean;
}

export interface JobRequirementGroupUpdate {
    name?: string;
    is_active?: boolean;
}

export const createJobRequirementGroup = async (
    body: JobRequirementGroupCreate,
): Promise<MutationResponse<JobRequirementGroup>> => {
    const res = await axiosInstance.post<MutationResponse<JobRequirementGroup>>(GROUP_BASE, body);
    return res.data;
};

export const updateJobRequirementGroup = async ({
    id,
    data,
}: {
    id: number;
    data: JobRequirementGroupUpdate;
}): Promise<MutationResponse<JobRequirementGroup>> => {
    const res = await axiosInstance.patch<MutationResponse<JobRequirementGroup>>(`${GROUP_BASE}/${id}`, data);
    return res.data;
};

export const deleteJobRequirementGroup = async (id: number): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${GROUP_BASE}/${id}`);
    return res.data;
};

// ── Requirement items ──────────────────────────────────────────────────────
export const fetchJobRequirementItems = async (groupId: number): Promise<JobRequirementItem[]> => {
    const res = await axiosInstance.get<JobRequirementItem[]>(ITEM_BASE, {
        params: { group_id: groupId },
    });
    return res.data ?? [];
};

export interface JobRequirementItemCreate {
    group_id: number;
    dimension_id: number;
    text: string;
    sort_order?: number;
}

export interface JobRequirementItemUpdate {
    dimension_id?: number;
    text?: string;
    sort_order?: number;
}

export const createJobRequirementItem = async (
    body: JobRequirementItemCreate,
): Promise<MutationResponse<JobRequirementItem>> => {
    const res = await axiosInstance.post<MutationResponse<JobRequirementItem>>(ITEM_BASE, body);
    return res.data;
};

export const updateJobRequirementItem = async ({
    id,
    data,
}: {
    id: number;
    data: JobRequirementItemUpdate;
}): Promise<MutationResponse<JobRequirementItem>> => {
    const res = await axiosInstance.patch<MutationResponse<JobRequirementItem>>(`${ITEM_BASE}/${id}`, data);
    return res.data;
};

export const deleteJobRequirementItem = async (id: number): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${ITEM_BASE}/${id}`);
    return res.data;
};
