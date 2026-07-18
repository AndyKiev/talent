import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums.ts';
import type { MutationResponse } from '../../../types/mutationResponse';
export type { MutationResponse };

const BASE = `${BASE_URL}/review_level_requirements`;

export interface ReviewLevelRequirement {
    id: number;
    level_id: number;
    text_key: string;
    sort_order: number;
    is_active: boolean;
}

export interface ReviewLevelRequirementCreate {
    level_id: number;
    text_key: string;
    sort_order: number;
    is_active: boolean;
    // Optional inline EN/UK text — when set, the backend upserts the translation
    // for text_key before creating the row.
    text_eng?: string;
    text_ukr?: string;
}

export interface ReviewLevelRequirementUpdate {
    level_id?: number;
    text_key?: string;
    sort_order?: number;
    is_active?: boolean;
}

export const fetchReviewLevelRequirements = async (
    levelId?: number,
): Promise<ReviewLevelRequirement[]> => {
    const res = await axiosInstance.get<ReviewLevelRequirement[]>(BASE, {
        params: levelId ? { level_id: levelId } : undefined,
    });
    return res.data ?? [];
};

export const createReviewLevelRequirement = async (
    body: ReviewLevelRequirementCreate,
): Promise<MutationResponse<ReviewLevelRequirement>> => {
    const res = await axiosInstance.post<MutationResponse<ReviewLevelRequirement>>(BASE, body);
    return res.data;
};

export const updateReviewLevelRequirement = async ({
    id,
    data,
}: {
    id: number;
    data: ReviewLevelRequirementUpdate;
}): Promise<MutationResponse<ReviewLevelRequirement>> => {
    const res = await axiosInstance.patch<MutationResponse<ReviewLevelRequirement>>(
        `${BASE}/${id}`,
        data,
    );
    return res.data;
};

export const deleteReviewLevelRequirement = async (
    id: number,
): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${BASE}/${id}`);
    return res.data;
};
