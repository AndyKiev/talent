import { BASE_URL } from '../../../../utils/eNums';
import type { MutationResponse } from '../../../../types/mutationResponse';
export type { MutationResponse };
import { createCrudApi } from '../../../../api/createCrudApi';

const BASE = `${BASE_URL}/recruitment_candidate_sources`;

export interface RecruitmentCandidateSource {
    id: number;
    key: string;
    description: string | null;
    sort_order: number;
}

export interface RecruitmentCandidateSourceCreate {
    key: string;
    description?: string | null;
    sort_order?: number;
}

export interface RecruitmentCandidateSourceUpdate {
    key?: string;
    description?: string | null;
    sort_order?: number;
}

const crud = createCrudApi<RecruitmentCandidateSource, RecruitmentCandidateSourceCreate, RecruitmentCandidateSourceUpdate>(BASE);

export const fetchCandidateSources = crud.fetchList;

export const createCandidateSource = crud.create;

export const updateCandidateSource = crud.update;

export const deleteCandidateSource = crud.remove;
