// src/components/training/training_types/trainingTypeApi.ts
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums.ts';

const BASE = `${BASE_URL}/training_types`;

export interface TrainingType {
    id: number;
    name: string;
    key: string;
    description: string | null;
    training_category_id: number;
    training_link_type_id: number;
    job_category_ids: number[];
    job_ids: number[];
    created_at: string;
    training_category_name: string | null;
    training_link_type_key: string | null;
    job_category_keys: string[];
    job_names: string[];
}

export interface TrainingTypeCreate {
    name: string;
    key: string;
    description?: string | null;
    training_category_id: number;
    training_link_type_id: number;
    job_category_ids?: number[];
    job_ids?: number[];
}

export interface TrainingTypeUpdate {
    name?: string;
    key?: string;
    description?: string | null;
    training_category_id?: number;
    training_link_type_id?: number;
    job_category_ids?: number[];
    job_ids?: number[];
}

export interface MutationResponse<T> {
    detail: string;
    data: T;
}

export const fetchTrainingTypes = async (): Promise<TrainingType[]> => {
    const res = await axiosInstance.get<TrainingType[]>(BASE);
    return res.data ?? [];
};

export const fetchEligibleTrainingTypes = async (employeeId: number): Promise<TrainingType[]> => {
    const res = await axiosInstance.get<TrainingType[]>(`${BASE}/eligible/${employeeId}`);
    return res.data ?? [];
};

export const createTrainingType = async (
    body: TrainingTypeCreate,
): Promise<MutationResponse<TrainingType>> => {
    const res = await axiosInstance.post<MutationResponse<TrainingType>>(BASE, body);
    return res.data;
};

export const updateTrainingType = async ({
    id,
    data,
}: {
    id: number;
    data: TrainingTypeUpdate;
}): Promise<MutationResponse<TrainingType>> => {
    const res = await axiosInstance.patch<MutationResponse<TrainingType>>(`${BASE}/${id}`, data);
    return res.data;
};

export const deleteTrainingType = async (id: number): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${BASE}/${id}`);
    return res.data;
};
