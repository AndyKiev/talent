import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums.ts';

const BASE = `${BASE_URL}/review_levels`;

export interface ReviewLevelRequirement {
    id: number;
    level_id: number;
    text_key: string;
    sort_order: number;
    is_active: boolean;
}

export interface ReviewLevel {
    id: number;
    name_key: string;
    description_key: string | null;
    sort_order: number;
    is_active: boolean;
    requirements: ReviewLevelRequirement[];
}

export interface ReviewLevelCreate {
    name_key: string;
    description_key?: string | null;
    sort_order: number;
    is_active: boolean;
    // Optional inline EN/UK text — when set, the backend upserts the translation
    // for name_key / description_key before creating the row.
    name_eng?: string;
    name_ukr?: string;
    description_eng?: string;
    description_ukr?: string;
}

export interface ReviewLevelUpdate {
    name_key?: string;
    description_key?: string | null;
    sort_order?: number;
    is_active?: boolean;
}

export interface MutationResponse<T> {
    detail: string;
    data: T;
}

export const fetchReviewLevels = async (): Promise<ReviewLevel[]> => {
    const res = await axiosInstance.get<ReviewLevel[]>(BASE);
    return res.data ?? [];
};

export const createReviewLevel = async (
    body: ReviewLevelCreate,
): Promise<MutationResponse<ReviewLevel>> => {
    const res = await axiosInstance.post<MutationResponse<ReviewLevel>>(BASE, body);
    return res.data;
};

export const updateReviewLevel = async ({
    id,
    data,
}: {
    id: number;
    data: ReviewLevelUpdate;
}): Promise<MutationResponse<ReviewLevel>> => {
    const res = await axiosInstance.patch<MutationResponse<ReviewLevel>>(`${BASE}/${id}`, data);
    return res.data;
};

export const deleteReviewLevel = async (id: number): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${BASE}/${id}`);
    return res.data;
};
