import { BASE_URL } from '../../../../utils/eNums';
import type { MutationResponse } from '../../../../types/mutationResponse';
export type { MutationResponse };
import { createCrudApi } from '../../../../api/createCrudApi';

const BASE = `${BASE_URL}/candidate_sources`;

export interface CandidateSource {
    id: number;
    key: string;
    description: string | null;
    sort_order: number;
}

export interface CandidateSourceCreate {
    key: string;
    description?: string | null;
    sort_order?: number;
}

export interface CandidateSourceUpdate {
    key?: string;
    description?: string | null;
    sort_order?: number;
}

const crud = createCrudApi<CandidateSource, CandidateSourceCreate, CandidateSourceUpdate>(BASE);

export const fetchCandidateSources = crud.fetchList;

export const createCandidateSource = crud.create;

export const updateCandidateSource = crud.update;

export const deleteCandidateSource = crud.remove;
