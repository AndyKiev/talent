// src/components/admin/talent-periods/talentPeriodApi.ts
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from "../../../utils/eNums.ts"

const BASE = `${BASE_URL}/admin/talent-periods`;

export interface TalentPeriod {
    id: number;
    name: string;
    description: string | null;
    is_active: boolean;
    created_at: string;
}

export interface TalentPeriodCreate {
    name: string;
    description?: string | null;
    is_active: boolean;
}

export interface TalentPeriodUpdate {
    name?: string;
    description?: string | null;
    is_active?: boolean;
}

export interface MutationResponse<T> {
    detail: string;
    data: T;
}

export const fetchTalentPeriods = async (): Promise<TalentPeriod[]> => {
    const res = await axiosInstance.get<TalentPeriod[]>(BASE);
    return res.data ?? [];
};

export const createTalentPeriod = async (
    body: TalentPeriodCreate,
): Promise<MutationResponse<TalentPeriod>> => {
    const res = await axiosInstance.post<MutationResponse<TalentPeriod>>(BASE, body);
    return res.data;
};

export const updateTalentPeriod = async ({
                                             id,
                                             data,
                                         }: {
    id: number;
    data: TalentPeriodUpdate;
}): Promise<MutationResponse<TalentPeriod>> => {
    const res = await axiosInstance.patch<MutationResponse<TalentPeriod>>(`${BASE}/${id}`, data);
    return res.data;
};

export const deleteTalentPeriod = async (id: number): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${BASE}/${id}`);
    return res.data;
};