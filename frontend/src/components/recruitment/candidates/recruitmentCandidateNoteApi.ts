import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums.ts';
import type { MutationResponse } from './recruitmentCandidateApi';

const BASE = `${BASE_URL}/recruitment_candidate_notes`;

export interface RecruitmentCandidateNoteAuthorMini {
    id: number;
    name: string;
    code: string | null;
}

export interface RecruitmentCandidateNote {
    id: number;
    candidate_id: number;
    created_by: number;
    body: string;
    created_at: string;
    creator: RecruitmentCandidateNoteAuthorMini | null;
}

export const fetchCandidateNotes = async (candidateId: number): Promise<RecruitmentCandidateNote[]> => {
    const res = await axiosInstance.get<RecruitmentCandidateNote[]>(BASE, {
        params: { candidate_id: candidateId },
    });
    return res.data ?? [];
};

export const createCandidateNote = async (body: {
    candidate_id: number;
    body: string;
}): Promise<MutationResponse<RecruitmentCandidateNote>> => {
    const res = await axiosInstance.post<MutationResponse<RecruitmentCandidateNote>>(BASE, body);
    return res.data;
};
