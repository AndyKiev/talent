// src/components/training/training_types/trainingTypeApi.ts
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums.ts';
import type { MutationResponse } from '../../../types/mutationResponse';
export type { MutationResponse };
import { createCrudApi } from '../../../api/createCrudApi';

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

const crud = createCrudApi<TrainingType, TrainingTypeCreate, TrainingTypeUpdate>(BASE);

export const fetchTrainingTypes = crud.fetchList;

export const fetchEligibleTrainingTypes = async (employeeId: number): Promise<TrainingType[]> => {
    const res = await axiosInstance.get<TrainingType[]>(`${BASE}/eligible/${employeeId}`);
    return res.data ?? [];
};

export const createTrainingType = crud.create;

export const updateTrainingType = crud.update;

export const deleteTrainingType = crud.remove;
