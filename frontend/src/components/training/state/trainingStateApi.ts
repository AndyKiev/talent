// src/components/training/state/trainingStateApi.ts
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums.ts';

const BASE = `${BASE_URL}/employee_trainings`;

export interface TrainingStateRow {
    employee_id: number;
    employee_name: string;
    employee_code: string;
    main_department_id: number | null;
    main_department_name: string | null;
    main_department_category_sort_order: number;
    direct_department_name: string | null;
    job_name: string | null;
    department_category_key: string | null;
    department_category_name: string | null;
    department_category_sort_order: number;
    department_type_name: string | null;
    status_key: string;
}

export const fetchTrainingState = async (trainingTypeId: number): Promise<TrainingStateRow[]> => {
    const res = await axiosInstance.get<TrainingStateRow[]>(`${BASE}/state`, {
        params: { training_type_id: trainingTypeId },
    });
    return res.data ?? [];
};
