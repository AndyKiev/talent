import { axiosInstance } from '../../api/axiosInstance';
import { BASE_URL } from '../../utils/eNums.ts';
import type { MutationResponse } from './candidateApi';

const BASE = `${BASE_URL}/candidate_applications`;

export type PipelineStatusKey =
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
    name: PipelineStatusKey;
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
    changed_at: string;
    status: ApplicationStatusMini | null;
    changer: ApplicationCreatorMini | null;
}

export interface CandidateApplication {
    id: number;
    candidate_id: number;
    recruitment_task_id: number;
    status_id: number;
    created_by: number;
    created_at: string;
    candidate: ApplicationCandidateMini | null;
    recruitment_task: ApplicationTaskMini | null;
    status: ApplicationStatusMini | null;
    creator: ApplicationCreatorMini | null;
    status_history: ApplicationHistoryMini[];
}

export interface CandidateApplicationCreate {
    candidate_id: number;
    recruitment_task_id: number;
}

export const fetchApplicationsByCandidate = async (
    candidateId: number,
): Promise<CandidateApplication[]> => {
    const res = await axiosInstance.get<CandidateApplication[]>(BASE, {
        params: { candidate_id: candidateId },
    });
    return res.data ?? [];
};

export const fetchApplicationsByTask = async (
    taskId: number,
): Promise<CandidateApplication[]> => {
    const res = await axiosInstance.get<CandidateApplication[]>(BASE, {
        params: { recruitment_task_id: taskId },
    });
    return res.data ?? [];
};

export const createApplication = async (
    body: CandidateApplicationCreate,
): Promise<MutationResponse<CandidateApplication>> => {
    const res = await axiosInstance.post<MutationResponse<CandidateApplication>>(BASE, body);
    return res.data;
};

export const changeApplicationStatus = async ({
    id,
    statusKey,
}: {
    id: number;
    statusKey: PipelineStatusKey;
}): Promise<MutationResponse<CandidateApplication>> => {
    const res = await axiosInstance.post<MutationResponse<CandidateApplication>>(
        `${BASE}/${id}/status`,
        { status_key: statusKey },
    );
    return res.data;
};

export const deleteApplication = async (id: number): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${BASE}/${id}`);
    return res.data;
};
