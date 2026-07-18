import { BASE_URL } from '../../../utils/eNums.ts';
import type { MutationResponse } from '../../../types/mutationResponse';
export type { MutationResponse };
import { createCrudApi } from '../../../api/createCrudApi';

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

const crud = createCrudApi<ReviewLevel, ReviewLevelCreate, ReviewLevelUpdate>(BASE);

export const fetchReviewLevels = crud.fetchList;

export const createReviewLevel = crud.create;

export const updateReviewLevel = crud.update;

export const deleteReviewLevel = crud.remove;
