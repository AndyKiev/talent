import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from "../../../utils/eNums.ts"

const BASE = `${BASE_URL}/review_dimensions`;
const CRITERIA_BASE = `${BASE_URL}/review_dimension_criteria`;

export interface ReviewDimensionCriteria {
    id: number;
    dimension_id: number;
    text: string;
    sort_order: number;
    is_active: boolean;
}

export interface ReviewDimension {
    id: number;
    name: string;
    key: string;
    description: string | null;
    is_active: boolean;
    color: string;
    sort_order: number;
    criteria: ReviewDimensionCriteria[];
}

export interface ReviewDimensionCreate {
    name: string;
    key: string;
    description?: string | null;
    is_active: boolean;
    color: string;
    sort_order: number;
}

export interface ReviewDimensionUpdate {
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

export const fetchReviewDimensions = async (): Promise<ReviewDimension[]> => {
    const res = await axiosInstance.get<ReviewDimension[]>(BASE);
    return res.data ?? [];
};

export const createReviewDimension = async (
    body: ReviewDimensionCreate,
): Promise<MutationResponse<ReviewDimension>> => {
    const res = await axiosInstance.post<MutationResponse<ReviewDimension>>(BASE, body);
    return res.data;
};

export const updateReviewDimension = async ({
    id,
    data,
}: {
    id: number;
    data: ReviewDimensionUpdate;
}): Promise<MutationResponse<ReviewDimension>> => {
    const res = await axiosInstance.patch<MutationResponse<ReviewDimension>>(`${BASE}/${id}`, data);
    return res.data;
};

export const deleteReviewDimension = async (id: number): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${BASE}/${id}`);
    return res.data;
};

// Criteria API
export interface CriteriaCreate {
    dimension_id: number;
    text: string;
    sort_order?: number;
    is_active?: boolean;
}

export interface CriteriaUpdate {
    text?: string;
    sort_order?: number;
    is_active?: boolean;
}

export const fetchCriteria = async (dimensionId: number): Promise<ReviewDimensionCriteria[]> => {
    const res = await axiosInstance.get<ReviewDimensionCriteria[]>(CRITERIA_BASE, {
        params: { dimension_id: dimensionId },
    });
    return res.data ?? [];
};

export const createCriteria = async (
    body: CriteriaCreate,
): Promise<MutationResponse<ReviewDimensionCriteria>> => {
    const res = await axiosInstance.post<MutationResponse<ReviewDimensionCriteria>>(CRITERIA_BASE, body);
    return res.data;
};

export const updateCriteria = async ({
    id,
    data,
}: {
    id: number;
    data: CriteriaUpdate;
}): Promise<MutationResponse<ReviewDimensionCriteria>> => {
    const res = await axiosInstance.patch<MutationResponse<ReviewDimensionCriteria>>(`${CRITERIA_BASE}/${id}`, data);
    return res.data;
};

export const deleteCriteria = async (id: number): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${CRITERIA_BASE}/${id}`);
    return res.data;
};
