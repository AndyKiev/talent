// src/components/organigram/organigramApi.ts
//
// Self-contained API layer for the standalone organigram component. Only
// infrastructure (axios, BASE_URL) and the employee-event api module are
// shared — everything organigram-specific lives in this folder.
import { axiosInstance } from '../../api/axiosInstance';
import { BASE_URL } from '../../utils/eNums';

// ── Organigram tree ───────────────────────────────────────────────────────────

export interface OrganigramEmployee {
    id: number;
    code: string;
    name: string;
    // True when this placement rests on a ready (not-yet-applied) event —
    // rendered ghosted at the provisional spot; the confirmed spot stays normal.
    is_pending: boolean;
    // True when the employee has ANY open (draft/ready) event, whatever its
    // date — a new event cannot be created until it is applied, so dragging
    // is disabled for them.
    has_open_event: boolean;
}

export interface OrganigramJob {
    job_id: number;
    job_name: string;
    // As-of the view date: planned qty (effective-dated targets) and fact qty
    // (provisional placements — matches the headcount calc grid).
    plan_qty: number;
    fact_qty: number;
    employees: OrganigramEmployee[];
}

export interface OrganigramNode {
    department_id: number;
    department_name: string;
    department_type_id: number | null;
    department_type_name: string | null;
    // Category key (e.g. 'store_departments') — first such level stacks vertically.
    department_category_key: string | null;
    jobs: OrganigramJob[];
    children: OrganigramNode[];
}

export const fetchOrganigram = async (
    departmentId: number,
    isoDate: string,
): Promise<OrganigramNode> => {
    const res = await axiosInstance.get<OrganigramNode>(
        `${BASE_URL}/department_job_targets/organigram`,
        { params: { department_id: departmentId, on_date: isoDate } },
    );
    return res.data;
};

// ── Drag-and-drop move ────────────────────────────────────────────────────────

// One drag-and-drop organigram move: who is dragged and where they were
// dropped. Null target fields mean "picked later in the confirm dialog"
// (drop on a department box = job picked there; drop on the transfer bay =
// department AND job picked there).
export interface OrganigramMove {
    employeeId: number;
    employeeName: string;
    fromDeptId: number;
    fromDeptName: string;
    fromJobId: number;
    fromJobName: string;
    toDeptId: number | null;
    toDeptName: string | null;
    toDeptTypeId: number | null;
    toJobId: number | null;
    toJobName: string | null;
}

/** PROMOTION when the department stays, TRANSFER when it changes (or is
 * still unpicked — the bay always means another department). */
export const moveEventCode = (move: OrganigramMove): 'PROMOTION' | 'TRANSFER' =>
    move.toDeptId != null && move.toDeptId === move.fromDeptId
        ? 'PROMOTION'
        : 'TRANSFER';

// ── Event creation (keeps the backend's translated success detail) ────────────

export interface OrganigramEventChangeCreate {
    direction_type_id: number;
    new_job_id?: number | null;
    new_status_id?: number | null;
    new_department_id?: number | null;
}

export interface OrganigramEventCreate {
    event_type_id: number;
    status_id: number;
    effective_date: string;
    changes: OrganigramEventChangeCreate[];
}

export interface OrganigramEventCreated {
    // Translated success message from employee_event_messages.py.
    detail: string;
}

export const createOrganigramEvent = async (
    employeeId: number,
    payload: OrganigramEventCreate,
): Promise<OrganigramEventCreated> => {
    const res = await axiosInstance.post<OrganigramEventCreated>(
        `${BASE_URL}/employees/${employeeId}/events`,
        payload,
    );
    return res.data;
};

// ── Department pickers (scope roots + subtree) ────────────────────────────────

export interface OrganigramScopeDepartment {
    id: number;
    name: string;
    category_key: string | null;
    category_name: string | null;
}

export const fetchOrganigramScopeDepartments = async (): Promise<
    OrganigramScopeDepartment[]
> => {
    const res = await axiosInstance.get<OrganigramScopeDepartment[]>(
        `${BASE_URL}/employees/scope_departments`,
    );
    return res.data ?? [];
};

export interface OrganigramDepartmentNode {
    id: number;
    name: string;
    department_type_id: number;
    department_type: { id: number; name: string } | null;
    children: OrganigramDepartmentNode[];
}

export const fetchOrganigramDepartmentSubtree = async (
    id: number,
): Promise<OrganigramDepartmentNode> => {
    const res = await axiosInstance.get<OrganigramDepartmentNode>(
        `${BASE_URL}/departments/${id}`,
    );
    return res.data;
};
