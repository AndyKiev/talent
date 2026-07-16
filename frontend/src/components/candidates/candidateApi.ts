import { axiosInstance } from '../../api/axiosInstance';
import { BASE_URL } from '../../utils/eNums.ts';

const CANDIDATE_BASE = `${BASE_URL}/candidates`;
const SOURCE_BASE = `${BASE_URL}/candidate_sources`;
const PIPELINE_STATUS_BASE = `${BASE_URL}/pipeline_statuses`;

export interface CandidateSourceMini {
    id: number;
    key: string;
}

export interface CandidatePhoneMini {
    id: number;
    phone: string;
    sort_order: number;
}

export interface Candidate {
    id: number;
    first_name: string;
    last_name: string;
    email: string | null;
    source_id: number | null;
    created_by: number;
    created_at: string;
    source: CandidateSourceMini | null;
    phones: CandidatePhoneMini[];
    application_count: number;
    furthest_stage: string | null;
    furthest_stage_sort: number | null;
}

export interface CandidateCreate {
    first_name: string;
    last_name: string;
    email?: string | null;
    source_id?: number | null;
    phones: string[];
}

export interface CandidateUpdate {
    first_name?: string;
    last_name?: string;
    email?: string | null;
    source_id?: number | null;
    phones?: string[] | null;
}

export interface CandidateSourceRow {
    id: number;
    key: string;
    description: string | null;
    sort_order: number;
}

export interface PipelineStatusRow {
    id: number;
    name: string;
    description: string | null;
    sort_order: number;
}

export interface MutationResponse<T> {
    detail: string;
    data: T;
}

export const fetchCandidates = async (): Promise<Candidate[]> => {
    const res = await axiosInstance.get<Candidate[]>(CANDIDATE_BASE);
    return res.data ?? [];
};

export const fetchCandidate = async (id: number): Promise<Candidate> => {
    const res = await axiosInstance.get<Candidate>(`${CANDIDATE_BASE}/${id}`);
    return res.data;
};

export const createCandidate = async (
    body: CandidateCreate,
): Promise<MutationResponse<Candidate>> => {
    const res = await axiosInstance.post<MutationResponse<Candidate>>(CANDIDATE_BASE, body);
    return res.data;
};

export const updateCandidate = async ({
    id,
    data,
}: {
    id: number;
    data: CandidateUpdate;
}): Promise<MutationResponse<Candidate>> => {
    const res = await axiosInstance.patch<MutationResponse<Candidate>>(`${CANDIDATE_BASE}/${id}`, data);
    return res.data;
};

export const deleteCandidate = async (id: number): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${CANDIDATE_BASE}/${id}`);
    return res.data;
};

export const fetchCandidateSources = async (): Promise<CandidateSourceRow[]> => {
    const res = await axiosInstance.get<CandidateSourceRow[]>(SOURCE_BASE);
    return res.data ?? [];
};

export const fetchPipelineStatuses = async (): Promise<PipelineStatusRow[]> => {
    const res = await axiosInstance.get<PipelineStatusRow[]>(PIPELINE_STATUS_BASE);
    return res.data ?? [];
};
