import { axiosInstance } from '../../api/axiosInstance';
import { BASE_URL } from '../../utils/eNums.ts';
import type { MutationResponse } from '../../types/mutationResponse';
export type { MutationResponse };

const BASE = `${BASE_URL}/interviews`;
const FEEDBACK_BASE = `${BASE_URL}/interview_feedbacks`;

export type Recommendation = 'hire' | 'no_hire' | 'maybe';

export interface InterviewEmployeeMini {
    id: number;
    name: string;
    code: string | null;
}

export interface InterviewCandidateMini {
    id: number;
    first_name: string;
    last_name: string;
}

export interface InterviewJobMini {
    id: number;
    name: string;
}

export interface InterviewInterviewerMini {
    id: number;
    employee_id: number;
    employee: InterviewEmployeeMini | null;
}

export interface InterviewFeedback {
    id: number;
    interview_id: number;
    author_id: number;
    body: string;
    recommendation: Recommendation | null;
    created_at: string;
    author: InterviewEmployeeMini | null;
}

export interface Interview {
    id: number;
    application_id: number;
    scheduled_at: string;
    location: string;
    created_by: number;
    created_at: string;
    interviewers: InterviewInterviewerMini[];
    feedbacks: InterviewFeedback[];
    candidate: InterviewCandidateMini | null;
    job: InterviewJobMini | null;
    recruitment_task_id: number | null;
}

export interface InterviewCreate {
    application_id: number;
    scheduled_at: string; // ISO datetime
    location: string;
    interviewer_ids: number[]; // 1..3
}

export interface InterviewUpdate {
    scheduled_at?: string;
    location?: string;
    interviewer_ids?: number[];
}

export const fetchInterviews = async (params: {
    application_id?: number;
    candidate_id?: number;
    mine?: boolean;
}): Promise<Interview[]> => {
    const res = await axiosInstance.get<Interview[]>(BASE, { params });
    return res.data ?? [];
};

export const fetchAvailableInterviewers = async (): Promise<InterviewEmployeeMini[]> => {
    const res = await axiosInstance.get<InterviewEmployeeMini[]>(`${BASE}/available_interviewers`);
    return res.data ?? [];
};

export const createInterview = async (
    body: InterviewCreate,
): Promise<MutationResponse<Interview>> => {
    const res = await axiosInstance.post<MutationResponse<Interview>>(BASE, body);
    return res.data;
};

export const updateInterview = async ({
    id,
    data,
}: {
    id: number;
    data: InterviewUpdate;
}): Promise<MutationResponse<Interview>> => {
    const res = await axiosInstance.patch<MutationResponse<Interview>>(`${BASE}/${id}`, data);
    return res.data;
};

export const deleteInterview = async (id: number): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${BASE}/${id}`);
    return res.data;
};

export const fetchInterviewFeedbacks = async (params: {
    interview_id?: number;
    candidate_id?: number;
}): Promise<InterviewFeedback[]> => {
    const res = await axiosInstance.get<InterviewFeedback[]>(FEEDBACK_BASE, { params });
    return res.data ?? [];
};

export const createInterviewFeedback = async (body: {
    interview_id: number;
    body: string;
    recommendation?: Recommendation | null;
}): Promise<MutationResponse<InterviewFeedback>> => {
    const res = await axiosInstance.post<MutationResponse<InterviewFeedback>>(FEEDBACK_BASE, body);
    return res.data;
};
