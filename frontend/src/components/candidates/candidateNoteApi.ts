import { axiosInstance } from '../../api/axiosInstance';
import { BASE_URL } from '../../utils/eNums.ts';
import type { MutationResponse } from './candidateApi';

const BASE = `${BASE_URL}/candidate_notes`;

export interface CandidateNoteAuthorMini {
    id: number;
    name: string;
    code: string | null;
}

export interface CandidateNote {
    id: number;
    candidate_id: number;
    author_id: number;
    body: string;
    created_at: string;
    author: CandidateNoteAuthorMini | null;
}

export const fetchCandidateNotes = async (candidateId: number): Promise<CandidateNote[]> => {
    const res = await axiosInstance.get<CandidateNote[]>(BASE, {
        params: { candidate_id: candidateId },
    });
    return res.data ?? [];
};

export const createCandidateNote = async (body: {
    candidate_id: number;
    body: string;
}): Promise<MutationResponse<CandidateNote>> => {
    const res = await axiosInstance.post<MutationResponse<CandidateNote>>(BASE, body);
    return res.data;
};
