import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums.ts';
import type { MutationResponse } from '../../../types/mutationResponse';
export type { MutationResponse };

const BASE = `${BASE_URL}/recruitment_interviews`;
const FEEDBACK_BASE = `${BASE_URL}/recruitment_interview_feedbacks`;

export type Recommendation = 'hire' | 'no_hire' | 'maybe';

export interface RecruitmentInterviewEmployeeMini {
    id: number;
    name: string;
    code: string | null;
}

export interface RecruitmentInterviewCandidateMini {
    id: number;
    first_name: string;
    last_name: string;
}

export interface RecruitmentInterviewJobMini {
    id: number;
    name: string;
}

export interface RecruitmentInterviewInterviewerMini {
    id: number;
    employee_id: number;
    employee: RecruitmentInterviewEmployeeMini | null;
}

export interface RecruitmentInterviewFeedback {
    id: number;
    interview_id: number;
    created_by: number;
    body: string;
    recommendation: Recommendation | null;
    created_at: string;
    creator: RecruitmentInterviewEmployeeMini | null;
}

export interface RecruitmentInterview {
    id: number;
    application_id: number;
    scheduled_at: string;
    location: string;
    created_by: number;
    created_at: string;
    interviewers: RecruitmentInterviewInterviewerMini[];
    feedbacks: RecruitmentInterviewFeedback[];
    candidate: RecruitmentInterviewCandidateMini | null;
    job: RecruitmentInterviewJobMini | null;
    recruitment_task_id: number | null;
}

export interface RecruitmentInterviewCreate {
    application_id: number;
    scheduled_at: string; // ISO datetime
    location: string;
    interviewer_ids: number[]; // 1..3
}

export interface RecruitmentInterviewUpdate {
    scheduled_at?: string;
    location?: string;
    interviewer_ids?: number[];
}

export const fetchInterviews = async (params: {
    application_id?: number;
    candidate_id?: number;
    mine?: boolean;
}): Promise<RecruitmentInterview[]> => {
    const res = await axiosInstance.get<RecruitmentInterview[]>(BASE, { params });
    return res.data ?? [];
};

export const fetchAvailableInterviewers = async (): Promise<RecruitmentInterviewEmployeeMini[]> => {
    const res = await axiosInstance.get<RecruitmentInterviewEmployeeMini[]>(`${BASE}/available_interviewers`);
    return res.data ?? [];
};

export const createInterview = async (
    body: RecruitmentInterviewCreate,
): Promise<MutationResponse<RecruitmentInterview>> => {
    const res = await axiosInstance.post<MutationResponse<RecruitmentInterview>>(BASE, body);
    return res.data;
};

export const updateInterview = async ({
    id,
    data,
}: {
    id: number;
    data: RecruitmentInterviewUpdate;
}): Promise<MutationResponse<RecruitmentInterview>> => {
    const res = await axiosInstance.patch<MutationResponse<RecruitmentInterview>>(`${BASE}/${id}`, data);
    return res.data;
};

export const deleteInterview = async (id: number): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${BASE}/${id}`);
    return res.data;
};

export const fetchInterviewFeedbacks = async (params: {
    interview_id?: number;
    candidate_id?: number;
}): Promise<RecruitmentInterviewFeedback[]> => {
    const res = await axiosInstance.get<RecruitmentInterviewFeedback[]>(FEEDBACK_BASE, { params });
    return res.data ?? [];
};

export const createInterviewFeedback = async (body: {
    interview_id: number;
    body: string;
    recommendation?: Recommendation | null;
}): Promise<MutationResponse<RecruitmentInterviewFeedback>> => {
    const res = await axiosInstance.post<MutationResponse<RecruitmentInterviewFeedback>>(FEEDBACK_BASE, body);
    return res.data;
};
