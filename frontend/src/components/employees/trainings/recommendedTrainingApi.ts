// src/components/employees/trainings/recommendedTrainingApi.ts
//
// Recommended trainings — free-text development advice attached to the EMPLOYEE,
// not to a review. Two screens read these same rows: the people-review
// evaluation page and the employee card's Trainings tab.
//
// Deliberately independent of the training module (`employee_trainings` /
// `training_types`): these stay visible and editable when that module is off,
// which is why they have their own endpoints and their own status lookup.
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums.ts';
import type { MutationResponse } from '../../../types/mutationResponse';

const BASE = `${BASE_URL}/employee_recommended_trainings`;

/** A row of `employee_recommended_training_statuses`. Seeded; resolve by KEY. */
export interface RecommendedTrainingStatus {
    id: number;
    key: string;
    description: string;
    sort_order: number;
}

export interface RecommendedTraining {
    id: number;
    employee_id: number;
    employee_recommended_training_status_id: number;
    status_key: string;
    status_description: string;
    description: string;
    is_active: boolean;
    sort_order: number;
    created_at: string;
}

/** What the CALLER may do — computed server-side, mirrored here for affordances
 *  only. Every write is re-checked on the server. */
export interface RecommendedTrainingPermissions {
    can_write: boolean;
    can_delete: boolean;
}

export interface RecommendedTrainingList {
    items: RecommendedTraining[];
    permissions: RecommendedTrainingPermissions;
}

export interface RecommendedTrainingCreate {
    description: string;
    employee_recommended_training_status_id?: number | null;
}

export interface RecommendedTrainingUpdate {
    description?: string;
    employee_recommended_training_status_id?: number;
    is_active?: boolean;
}

export const fetchRecommendedTrainingStatuses = async (): Promise<RecommendedTrainingStatus[]> => {
    const res = await axiosInstance.get<RecommendedTrainingStatus[]>(`${BASE}/statuses`);
    return res.data ?? [];
};

/** Active rows only unless `includeInactive` — retiring a recommendation marks
 *  it inactive rather than deleting it, so the default list stays current. */
export const fetchRecommendedTrainings = async (
    employeeId: number,
    includeInactive = false,
): Promise<RecommendedTrainingList> => {
    const res = await axiosInstance.get<RecommendedTrainingList>(
        `${BASE}/employee/${employeeId}`,
        { params: { include_inactive: includeInactive } },
    );
    return res.data;
};

export const createRecommendedTraining = async (
    employeeId: number,
    body: RecommendedTrainingCreate,
): Promise<MutationResponse<RecommendedTraining>> => {
    const res = await axiosInstance.post<MutationResponse<RecommendedTraining>>(
        `${BASE}/employee/${employeeId}`,
        body,
    );
    return res.data;
};

export const updateRecommendedTraining = async (
    trainingId: number,
    body: RecommendedTrainingUpdate,
): Promise<MutationResponse<RecommendedTraining>> => {
    const res = await axiosInstance.patch<MutationResponse<RecommendedTraining>>(
        `${BASE}/${trainingId}`,
        body,
    );
    return res.data;
};

export const deleteRecommendedTraining = async (trainingId: number): Promise<void> => {
    await axiosInstance.delete(`${BASE}/${trainingId}`);
};

export const reorderRecommendedTrainings = async (
    employeeId: number,
    orderedIds: number[],
): Promise<void> => {
    await axiosInstance.post(`${BASE}/employee/${employeeId}/reorder`, {
        ordered_ids: orderedIds,
    });
};
