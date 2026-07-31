import { axiosInstance } from '../../api/axiosInstance';
import { BASE_URL } from '../../utils/eNums.ts';
import type { MutationResponse } from '../../types/mutationResponse';

const FACT_BASE = `${BASE_URL}/employee_facts`;
const FACT_TYPE_BASE = `${BASE_URL}/employee_fact_types`;

/**
 * One of the two kinds of numbered line — a row of `employee_fact_types`. Two
 * rows are seeded ('fact' / 'improvement'); resolve by KEY, never by id, since
 * ids move on a reseed.
 */
export interface EmployeeFactType {
    id: number;
    key: string;
    description: string;
    sort_order: number;
}

/** The seeded keys of `employee_fact_types` — a code contract, not display text. */
export const FACT_KEY_FACT = 'fact';
export const FACT_KEY_IMPROVEMENT = 'improvement';

/**
 * One numbered line about an employee.
 *
 * Owned by the EMPLOYEE, not by the review: it can be registered the moment it
 * is noticed and attached to a competence later.
 * `review_session_employee_evaluation_id` is null while it is still in the
 * unlinked pool.
 */
export interface EmployeeFact {
    id: number;
    employee_id: number;
    employee_fact_type_id: number;
    employee_fact_type_key: string;
    text: string;
    review_session_employee_evaluation_id: number | null;
    sort_order: number;
}

export const fetchEmployeeFactTypes = async (): Promise<EmployeeFactType[]> => {
    const res = await axiosInstance.get<EmployeeFactType[]>(FACT_TYPE_BASE);
    return res.data ?? [];
};

/** The employee's pool of facts not attached to any competence. Its length is
 *  the badge count on the evaluation page. */
export const fetchUnlinkedFacts = async (employeeId: number): Promise<EmployeeFact[]> => {
    const res = await axiosInstance.get<EmployeeFact[]>(`${FACT_BASE}/unlinked`, {
        params: { employee_id: employeeId },
    });
    return res.data ?? [];
};

export interface EmployeeFactCreate {
    employee_id: number;
    employee_fact_type_id: number;
    text: string;
    // Omitted by quick registration (the fact lands in the pool); sent by the
    // add-box under a competence so it is linked on creation.
    review_session_employee_evaluation_id?: number | null;
}

export const createEmployeeFact = async (
    payload: EmployeeFactCreate,
): Promise<MutationResponse<EmployeeFact>> => {
    const res = await axiosInstance.post<MutationResponse<EmployeeFact>>(FACT_BASE, payload);
    return res.data;
};

export interface EmployeeFactUpdate {
    text?: string;
    employee_fact_type_id?: number;
}

export const updateEmployeeFact = async (
    factId: number,
    payload: EmployeeFactUpdate,
): Promise<MutationResponse<EmployeeFact>> => {
    const res = await axiosInstance.patch<MutationResponse<EmployeeFact>>(
        `${FACT_BASE}/${factId}`,
        payload,
    );
    return res.data;
};

export const deleteEmployeeFact = async (
    factId: number,
): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${FACT_BASE}/${factId}`);
    return res.data;
};

/** Attach a fact to a competence. Moving between competences is the same call —
 *  a fact has at most one link, so the server updates it in place. Without
 *  `sort_order` the fact goes to the end of that competence's list. */
export const linkEmployeeFact = async (
    factId: number,
    evaluationId: number,
    sortOrder?: number,
): Promise<MutationResponse<EmployeeFact>> => {
    const res = await axiosInstance.post<MutationResponse<EmployeeFact>>(
        `${FACT_BASE}/${factId}/link`,
        {
            review_session_employee_evaluation_id: evaluationId,
            sort_order: sortOrder ?? null,
        },
    );
    return res.data;
};

/** Send a fact back to the pool. Deletes the LINK row only — the text stays. */
export const unlinkEmployeeFact = async (
    factId: number,
): Promise<MutationResponse<EmployeeFact>> => {
    const res = await axiosInstance.post<MutationResponse<EmployeeFact>>(
        `${FACT_BASE}/${factId}/unlink`,
        {},
    );
    return res.data;
};

/** Renumber ONE competence's list of ONE kind. The array order becomes sort_order. */
export const reorderEmployeeFacts = async (
    evaluationId: number,
    typeId: number,
    factIds: number[],
): Promise<MutationResponse<EmployeeFact[]>> => {
    const res = await axiosInstance.post<MutationResponse<EmployeeFact[]>>(
        `${FACT_BASE}/reorder`,
        {
            review_session_employee_evaluation_id: evaluationId,
            employee_fact_type_id: typeId,
            employee_fact_ids: factIds,
        },
    );
    return res.data;
};
