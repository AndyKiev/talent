import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums.ts';
import type { MutationResponse } from './recruitmentCandidateApi';

const BASE = `${BASE_URL}/recruitment_applications`;

export type RecruitmentApplicationStatusKey =
    | 'applied'
    | 'screen'
    | 'interview'
    | 'offer'
    | 'hired'
    | 'rejected';

export interface ApplicationCandidateMini {
    id: number;
    first_name: string;
    last_name: string;
    email: string | null;
}

export interface ApplicationJobMini {
    id: number;
    name: string;
}

export interface ApplicationTaskMini {
    id: number;
    job_id: number;
    job: ApplicationJobMini | null;
}

export interface ApplicationStatusMini {
    id: number;
    name: RecruitmentApplicationStatusKey;
    sort_order: number;
}

export interface ApplicationCreatorMini {
    id: number;
    name: string;
    code: string | null;
}

export interface ApplicationHistoryMini {
    id: number;
    status_id: number;
    created_by: number;
    created_at: string;
    status: ApplicationStatusMini | null;
    creator: ApplicationCreatorMini | null;
}

export interface RecruitmentApplication {
    id: number;
    candidate_id: number;
    recruitment_task_id: number;
    status_id: number;
    created_by: number;
    created_at: string;
    candidate: ApplicationCandidateMini | null;
    recruitment_task: ApplicationTaskMini | null;
    status: ApplicationStatusMini | null;
    status_history: ApplicationHistoryMini[];
}

export interface RecruitmentApplicationCreate {
    candidate_id: number;
    recruitment_task_id: number;
}

export const fetchApplicationsByCandidate = async (
    candidateId: number,
): Promise<RecruitmentApplication[]> => {
    const res = await axiosInstance.get<RecruitmentApplication[]>(BASE, {
        params: { candidate_id: candidateId },
    });
    return res.data ?? [];
};

export const fetchApplicationsByTask = async (
    taskId: number,
): Promise<RecruitmentApplication[]> => {
    const res = await axiosInstance.get<RecruitmentApplication[]>(BASE, {
        params: { recruitment_task_id: taskId },
    });
    return res.data ?? [];
};

export const createApplication = async (
    body: RecruitmentApplicationCreate,
): Promise<MutationResponse<RecruitmentApplication>> => {
    const res = await axiosInstance.post<MutationResponse<RecruitmentApplication>>(BASE, body);
    return res.data;
};

export const changeApplicationStatus = async ({
    id,
    statusKey,
}: {
    id: number;
    statusKey: RecruitmentApplicationStatusKey;
}): Promise<MutationResponse<RecruitmentApplication>> => {
    const res = await axiosInstance.post<MutationResponse<RecruitmentApplication>>(
        `${BASE}/${id}/status`,
        { status_key: statusKey },
    );
    return res.data;
};

export const deleteApplication = async (id: number): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${BASE}/${id}`);
    return res.data;
};
