import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums.ts';
import type { MutationResponse } from '../../../types/mutationResponse';
export type { MutationResponse };

const CANDIDATE_BASE = `${BASE_URL}/recruitment_candidates`;
const SOURCE_BASE = `${BASE_URL}/recruitment_candidate_sources`;
const PIPELINE_STATUS_BASE = `${BASE_URL}/recruitment_application_statuses`;

export interface RecruitmentCandidateSourceMini {
    id: number;
    key: string;
}

export interface RecruitmentCandidatePhoneMini {
    id: number;
    phone: string;
    sort_order: number;
}

export interface RecruitmentCandidate {
    id: number;
    first_name: string;
    last_name: string;
    email: string | null;
    candidate_source_id: number | null;
    created_by: number;
    created_at: string;
    source: RecruitmentCandidateSourceMini | null;
    phones: RecruitmentCandidatePhoneMini[];
    application_count: number;
    furthest_stage: string | null;
    furthest_stage_sort: number | null;
}

export interface RecruitmentCandidateCreate {
    first_name: string;
    last_name: string;
    email?: string | null;
    candidate_source_id?: number | null;
    phones: string[];
}

export interface RecruitmentCandidateUpdate {
    first_name?: string;
    last_name?: string;
    email?: string | null;
    candidate_source_id?: number | null;
    phones?: string[] | null;
}

export interface RecruitmentCandidateSourceRow {
    id: number;
    key: string;
    description: string | null;
    sort_order: number;
}

export interface RecruitmentApplicationStatusRow {
    id: number;
    name: string;
    description: string | null;
    sort_order: number;
}

export const fetchCandidates = async (): Promise<RecruitmentCandidate[]> => {
    const res = await axiosInstance.get<RecruitmentCandidate[]>(CANDIDATE_BASE);
    return res.data ?? [];
};

export const fetchCandidate = async (id: number): Promise<RecruitmentCandidate> => {
    const res = await axiosInstance.get<RecruitmentCandidate>(`${CANDIDATE_BASE}/${id}`);
    return res.data;
};

export const createCandidate = async (
    body: RecruitmentCandidateCreate,
): Promise<MutationResponse<RecruitmentCandidate>> => {
    const res = await axiosInstance.post<MutationResponse<RecruitmentCandidate>>(CANDIDATE_BASE, body);
    return res.data;
};

export const updateCandidate = async ({
    id,
    data,
}: {
    id: number;
    data: RecruitmentCandidateUpdate;
}): Promise<MutationResponse<RecruitmentCandidate>> => {
    const res = await axiosInstance.patch<MutationResponse<RecruitmentCandidate>>(`${CANDIDATE_BASE}/${id}`, data);
    return res.data;
};

export const deleteCandidate = async (id: number): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${CANDIDATE_BASE}/${id}`);
    return res.data;
};

export const fetchCandidateSources = async (): Promise<RecruitmentCandidateSourceRow[]> => {
    const res = await axiosInstance.get<RecruitmentCandidateSourceRow[]>(SOURCE_BASE);
    return res.data ?? [];
};

export const fetchPipelineStatuses = async (): Promise<RecruitmentApplicationStatusRow[]> => {
    const res = await axiosInstance.get<RecruitmentApplicationStatusRow[]>(PIPELINE_STATUS_BASE);
    return res.data ?? [];
};
