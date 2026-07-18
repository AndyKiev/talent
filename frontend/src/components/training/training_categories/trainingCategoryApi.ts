// src/components/training/training_categories/trainingCategoryApi.ts
import { BASE_URL } from '../../../utils/eNums.ts';
import type { MutationResponse } from '../../../types/mutationResponse';
export type { MutationResponse };
import { createCrudApi } from '../../../api/createCrudApi';

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

const crud = createCrudApi<TrainingCategory, TrainingCategoryCreate, TrainingCategoryUpdate>(BASE);

export const fetchTrainingCategories = crud.fetchList;

export const createTrainingCategory = crud.create;

export const updateTrainingCategory = crud.update;

export const deleteTrainingCategory = crud.remove;
