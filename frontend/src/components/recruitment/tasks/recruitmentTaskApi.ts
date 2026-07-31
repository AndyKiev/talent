import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums.ts';
import type { MutationResponse } from '../../../types/mutationResponse';
export type { MutationResponse };

const TASK_BASE = `${BASE_URL}/recruitment_tasks`;
const STATUS_BASE = `${BASE_URL}/recruitment_task_statuses`;

export type RecruitmentStatusKey = 'created' | 'in_process' | 'fulfilled' | 'rejected';

export interface RecruitmentTaskJobMini {
    id: number;
    name: string;
    is_active: boolean;
}

export interface RecruitmentTaskStatusMini {
    id: number;
    name: RecruitmentStatusKey;
}

export interface RecruitmentTaskGroupMini {
    id: number;
    name: string;
    is_active: boolean;
}

export interface RecruitmentTaskCreatorMini {
    id: number;
    name: string;
    code: string | null;
}

export interface RecruitmentTaskDepartmentMini {
    id: number;
    name: string;
}

export interface TopOrgUnitMini {
    id: number;
    name: string;
}

export interface RecruitmentTask {
    id: number;
    job_id: number;
    job_requirement_group_id: number | null;
    department_id: number | null;
    openings: number;
    status_id: number;
    comment: string | null;
    target_deadline: string | null;
    created_by: number;
    created_at: string;
    in_process_at: string | null;
    closed_at: string | null;
    job: RecruitmentTaskJobMini | null;
    status: RecruitmentTaskStatusMini | null;
    requirement_group: RecruitmentTaskGroupMini | null;
    creator: RecruitmentTaskCreatorMini | null;
    department: RecruitmentTaskDepartmentMini | null;
    // Derived server-side: the exact department's store / directorate / board.
    top_org_unit: TopOrgUnitMini | null;
}

export interface RecruitmentTaskStatusRow {
    id: number;
    name: RecruitmentStatusKey;
    description: string | null;
}

export interface RecruitmentTaskCreate {
    job_id: number;
    job_requirement_group_id?: number | null;
    department_id?: number | null;
    openings?: number;
    comment?: string | null;
    target_deadline?: string | null;
}

export interface RecruitmentTaskUpdate {
    job_requirement_group_id?: number | null;
    department_id?: number | null;
    openings?: number;
    comment?: string | null;
    target_deadline?: string | null;
}

export const fetchRecruitmentTasks = async (): Promise<RecruitmentTask[]> => {
    const res = await axiosInstance.get<RecruitmentTask[]>(TASK_BASE);
    return res.data ?? [];
};

export const fetchRecruitmentTask = async (id: number): Promise<RecruitmentTask> => {
    const res = await axiosInstance.get<RecruitmentTask>(`${TASK_BASE}/${id}`);
    return res.data;
};

export const fetchRecruitmentTaskStatuses = async (): Promise<RecruitmentTaskStatusRow[]> => {
    const res = await axiosInstance.get<RecruitmentTaskStatusRow[]>(STATUS_BASE);
    return res.data ?? [];
};

export const createRecruitmentTask = async (
    body: RecruitmentTaskCreate,
): Promise<MutationResponse<RecruitmentTask>> => {
    const res = await axiosInstance.post<MutationResponse<RecruitmentTask>>(TASK_BASE, body);
    return res.data;
};

export const updateRecruitmentTask = async ({
    id,
    data,
}: {
    id: number;
    data: RecruitmentTaskUpdate;
}): Promise<MutationResponse<RecruitmentTask>> => {
    const res = await axiosInstance.patch<MutationResponse<RecruitmentTask>>(`${TASK_BASE}/${id}`, data);
    return res.data;
};

export const changeRecruitmentTaskStatus = async ({
    id,
    statusKey,
}: {
    id: number;
    statusKey: RecruitmentStatusKey;
}): Promise<MutationResponse<RecruitmentTask>> => {
    const res = await axiosInstance.post<MutationResponse<RecruitmentTask>>(`${TASK_BASE}/${id}/status`, {
        status_key: statusKey,
    });
    return res.data;
};

export const deleteRecruitmentTask = async (id: number): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${TASK_BASE}/${id}`);
    return res.data;
};
