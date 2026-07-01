// src/components/training/training_categories/trainingCategoryApi.ts
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums.ts';

const BASE = `${BASE_URL}/training_categories`;

export interface TrainingCategory {
    id: number;
    name: string;
    key: string;
    description: string | null;
    created_at: string;
}

export interface TrainingCategoryCreate {
    name: string;
    key: string;
    description?: string | null;
}

export interface TrainingCategoryUpdate {
    name?: string;
    key?: string;
    description?: string | null;
}

export interface MutationResponse<T> {
    detail: string;
    data: T;
}

export const fetchTrainingCategories = async (): Promise<TrainingCategory[]> => {
    const res = await axiosInstance.get<TrainingCategory[]>(BASE);
    return res.data ?? [];
};

export const createTrainingCategory = async (
    body: TrainingCategoryCreate,
): Promise<MutationResponse<TrainingCategory>> => {
    const res = await axiosInstance.post<MutationResponse<TrainingCategory>>(BASE, body);
    return res.data;
};

export const updateTrainingCategory = async ({
    id,
    data,
}: {
    id: number;
    data: TrainingCategoryUpdate;
}): Promise<MutationResponse<TrainingCategory>> => {
    const res = await axiosInstance.patch<MutationResponse<TrainingCategory>>(`${BASE}/${id}`, data);
    return res.data;
};

export const deleteTrainingCategory = async (id: number): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${BASE}/${id}`);
    return res.data;
};
