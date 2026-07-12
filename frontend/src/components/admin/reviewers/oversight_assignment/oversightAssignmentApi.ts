// src/components/admin/reviewers/oversight_assignment/oversightAssignmentApi.ts
import { axiosInstance } from '../../../../api/axiosInstance';
import { BASE_URL } from '../../../../utils/eNums';

const BASE = `${BASE_URL}/admin/oversight_assignment`;

export type OversightAssignmentStatus =
    | 'assigned'
    | 'overwritten'
    | 'already_assigned'
    | 'failed';

// reason_key values are translation keys resolved via getString:
// notParametrized | noHolderFound | onlySelfCandidate | multipleCandidates
export interface OversightAssignmentResultRow {
    employee_id: number;
    employee_code: string | null;
    employee_name: string | null;
    department_id: number | null;
    department_name: string | null;
    status: OversightAssignmentStatus;
    reason_key: string | null;
    candidates: string[];
    previous_manager_name: string | null;
    new_manager_name: string | null;
    levels_up: number | null;
}

export interface OversightAssignmentReport {
    detail: string;
    department_id: number;
    department_name: string | null;
    session_id: number | null;
    session_name: string | null;
    session_department_linked: boolean;
    max_levels_up: number;
    overwrite: boolean;
    total: number;
    assigned: number;
    overwritten: number;
    already_assigned: number;
    failed: number;
    rows: OversightAssignmentResultRow[];
}

export interface OversightAssignmentRunRequest {
    department_id: number;
    overwrite: boolean;
}

export const runOversightAssignment = async (
    body: OversightAssignmentRunRequest,
): Promise<OversightAssignmentReport> => {
    const res = await axiosInstance.post<OversightAssignmentReport>(`${BASE}/run`, body);
    return res.data;
};
