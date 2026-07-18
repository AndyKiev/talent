import { BASE_URL } from '../../../../utils/eNums.ts';
import type { MutationResponse } from '../../../../types/mutationResponse';
export type { MutationResponse };
import { createCrudApi } from '../../../../api/createCrudApi';

const BASE = `${BASE_URL}/recruitment_dimensions`;

export interface RecruitmentDimension {
    id: number;
    name: string;
    key: string;
    description: string | null;
    is_active: boolean;
    color: string;
    sort_order: number;
}

export interface RecruitmentDimensionCreate {
    name: string;
    key: string;
    description?: string | null;
    is_active: boolean;
    color: string;
    sort_order: number;
}

export interface RecruitmentDimensionUpdate {
    name?: string;
    key?: string;
    description?: string | null;
    is_active?: boolean;
    color?: string;
    sort_order?: number;
}

const crud = createCrudApi<RecruitmentDimension, RecruitmentDimensionCreate, RecruitmentDimensionUpdate>(BASE);

export const fetchRecruitmentDimensions = crud.fetchList;

export const createRecruitmentDimension = crud.create;

export const updateRecruitmentDimension = crud.update;

export const deleteRecruitmentDimension = crud.remove;
