import { axiosInstance } from '../../../../api/axiosInstance';
import { BASE_URL } from '../../../../utils/eNums.ts';

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

export interface MutationResponse<T> {
    detail: string;
    data: T;
}

export const fetchRecruitmentDimensions = async (): Promise<RecruitmentDimension[]> => {
    const res = await axiosInstance.get<RecruitmentDimension[]>(BASE);
    return res.data ?? [];
};

export const createRecruitmentDimension = async (
    body: RecruitmentDimensionCreate,
): Promise<MutationResponse<RecruitmentDimension>> => {
    const res = await axiosInstance.post<MutationResponse<RecruitmentDimension>>(BASE, body);
    return res.data;
};

export const updateRecruitmentDimension = async ({
    id,
    data,
}: {
    id: number;
    data: RecruitmentDimensionUpdate;
}): Promise<MutationResponse<RecruitmentDimension>> => {
    const res = await axiosInstance.patch<MutationResponse<RecruitmentDimension>>(`${BASE}/${id}`, data);
    return res.data;
};

export const deleteRecruitmentDimension = async (id: number): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${BASE}/${id}`);
    return res.data;
};
