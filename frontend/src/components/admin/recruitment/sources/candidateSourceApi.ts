import { axiosInstance } from '../../../../api/axiosInstance';
import { BASE_URL } from '../../../../utils/eNums';

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

export interface MutationResponse<T> {
    detail: string;
    data: T;
}

export const fetchCandidateSources = async (): Promise<CandidateSource[]> => {
    const res = await axiosInstance.get<CandidateSource[]>(BASE);
    return res.data ?? [];
};

export const createCandidateSource = async (
    body: CandidateSourceCreate,
): Promise<MutationResponse<CandidateSource>> => {
    const res = await axiosInstance.post<MutationResponse<CandidateSource>>(BASE, body);
    return res.data;
};

export const updateCandidateSource = async ({
    id,
    data,
}: {
    id: number;
    data: CandidateSourceUpdate;
}): Promise<MutationResponse<CandidateSource>> => {
    const res = await axiosInstance.patch<MutationResponse<CandidateSource>>(`${BASE}/${id}`, data);
    return res.data;
};

export const deleteCandidateSource = async (id: number): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${BASE}/${id}`);
    return res.data;
};
