import { axiosInstance } from '../../api/axiosInstance';
import { BASE_URL } from "../../utils/eNums.ts"

const RS_BASE = `${BASE_URL}/review_sessions`;
const RSE_BASE = `${BASE_URL}/review_session_employees`;
const EVAL_BASE = `${BASE_URL}/review_evaluations`;

// --- Review Session types ---
export interface ReviewSession {
    id: number;
    name: string;
    description: string | null;
    status: string;
    period_start: string | null;
    period_end: string | null;
    employee_count: number;
}

export interface ReviewSessionCreate {
    name: string;
    description?: string | null;
    period_start?: string | null;
    period_end?: string | null;
}

export interface MutationResponse<T> {
    detail: string;
    data: T;
}

// --- Review Session Employee types ---
export interface ReviewSessionEmployeeList {
    id: number;
    session_id: number;
    employee_id: number;
    status: string;
    employee_name: string;
    employee_code: string;
    scored_count: number;
    total_dimensions: number;
}

export interface Evaluation {
    id: number;
    review_session_employee_id: number;
    dimension_id: number;
    score: number | null;
    facts: string | null;
    improvement: string | null;
    dimension_name: string;
    dimension_key: string;
    dimension_description: string | null;
}

export interface ReviewSessionEmployee {
    id: number;
    session_id: number;
    employee_id: number;
    status: string;
    employee_name: string;
    employee_code: string;
    session_name: string;
    session_status: string;
    evaluations: Evaluation[];
}

// --- Review Session API ---
export const fetchReviewSessions = async (): Promise<ReviewSession[]> => {
    const res = await axiosInstance.get<ReviewSession[]>(RS_BASE);
    return res.data ?? [];
};

export const createReviewSession = async (
    body: ReviewSessionCreate,
): Promise<MutationResponse<ReviewSession>> => {
    const res = await axiosInstance.post<MutationResponse<ReviewSession>>(RS_BASE, body);
    return res.data;
};

export const openReviewSession = async (id: number): Promise<MutationResponse<ReviewSession>> => {
    const res = await axiosInstance.post<MutationResponse<ReviewSession>>(`${RS_BASE}/${id}/open`);
    return res.data;
};

export const closeReviewSession = async (id: number): Promise<MutationResponse<ReviewSession>> => {
    const res = await axiosInstance.post<MutationResponse<ReviewSession>>(`${RS_BASE}/${id}/close`);
    return res.data;
};

export const revertReviewSession = async (id: number): Promise<MutationResponse<ReviewSession>> => {
    const res = await axiosInstance.post<MutationResponse<ReviewSession>>(`${RS_BASE}/${id}/revert`);
    return res.data;
};

export const deleteReviewSession = async (id: number): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${RS_BASE}/${id}`);
    return res.data;
};

// --- Review Session Employee API ---
export const fetchSessionEmployees = async (
    sessionId: number,
): Promise<ReviewSessionEmployeeList[]> => {
    const res = await axiosInstance.get<ReviewSessionEmployeeList[]>(RSE_BASE, {
        params: { session_id: sessionId },
    });
    return res.data ?? [];
};

export const fetchMyReviews = async (): Promise<ReviewSessionEmployeeList[]> => {
    const res = await axiosInstance.get<ReviewSessionEmployeeList[]>(`${RSE_BASE}/my`);
    return res.data ?? [];
};

export const fetchRSEDetail = async (rseId: number): Promise<ReviewSessionEmployee> => {
    const res = await axiosInstance.get<ReviewSessionEmployee>(`${RSE_BASE}/${rseId}`);
    return res.data;
};

export const markReviewed = async (rseId: number): Promise<MutationResponse<ReviewSessionEmployee>> => {
    const res = await axiosInstance.post<MutationResponse<ReviewSessionEmployee>>(
        `${RSE_BASE}/${rseId}/reviewed`,
    );
    return res.data;
};

export const closeRSE = async (rseId: number): Promise<MutationResponse<ReviewSessionEmployee>> => {
    const res = await axiosInstance.post<MutationResponse<ReviewSessionEmployee>>(
        `${RSE_BASE}/${rseId}/close`,
    );
    return res.data;
};

export const revertRSE = async (rseId: number): Promise<MutationResponse<ReviewSessionEmployee>> => {
    const res = await axiosInstance.post<MutationResponse<ReviewSessionEmployee>>(
        `${RSE_BASE}/${rseId}/revert`,
    );
    return res.data;
};

export const reopenRSE = async (rseId: number): Promise<MutationResponse<ReviewSessionEmployee>> => {
    const res = await axiosInstance.post<MutationResponse<ReviewSessionEmployee>>(
        `${RSE_BASE}/${rseId}/reopen`,
    );
    return res.data;
};

// --- Evaluation API ---
export const fetchEvaluations = async (rseId: number): Promise<Evaluation[]> => {
    const res = await axiosInstance.get<Evaluation[]>(EVAL_BASE, {
        params: { review_session_employee_id: rseId },
    });
    return res.data ?? [];
};

export interface EvaluationBulkUpdate {
    id: number;
    score?: number | null;
    facts?: string | null;
    improvement?: string | null;
}

export const bulkUpdateEvaluations = async (
    updates: EvaluationBulkUpdate[],
): Promise<MutationResponse<Evaluation[]>> => {
    const res = await axiosInstance.put<MutationResponse<Evaluation[]>>(`${EVAL_BASE}/bulk`, updates);
    return res.data;
};
