// src/components/training/training_link_types/trainingLinkTypeApi.ts
// Read-only: link types are seeded (by_job_category / by_job / everyone), not
// user-managed — no create/update/delete UI. See TrainingTypeForm, which uses
// this list to drive the conditional job_category/job Select.
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums.ts';

const BASE = `${BASE_URL}/training_link_types`;

export interface TrainingLinkType {
    id: number;
    key: string;
    description: string | null;
    created_at: string;
}

export const fetchTrainingLinkTypes = async (): Promise<TrainingLinkType[]> => {
    const res = await axiosInstance.get<TrainingLinkType[]>(BASE);
    return res.data ?? [];
};
