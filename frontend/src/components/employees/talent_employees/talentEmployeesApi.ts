// src/components/employees/talent_employees/talentEmployeesApi.ts
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums';

const BASE = `${BASE_URL}/talent_audits`;

// One talent (target job) of an employee. talent_status_* / talent_period_* /
// qty_months are the EFFECTIVE values: the latest HRS interview result when
// one exists (is_hrs), else the HRM assessment.
export interface RosterTalent {
    talent_audit_job_id: number;
    target_job_id: number;
    job_name: string;
    job_status_id: number;
    job_status_key: string;
    job_status_name: string;
    talent_status_id: number;
    talent_status_key: string;
    talent_period_id: number;
    talent_period_name: string;
    qty_months: number;
    is_hrs: boolean;
    hrm_label: string;
    hrs_label: string | null;
    interview_id: number | null;
    interview_date: string | null;
}

export interface RosterRow {
    employee_id: number;
    code: string;
    name: string;
    status_id: number | null;
    status_name: string | null;
    job_id: number | null;
    job_name: string | null;
    main_department_id: number | null;
    main_department_name: string | null;
    talent_audit_id: number | null;
    talent_plus: boolean;
    // Closest period first — talents[0] is the main talent.
    talents: RosterTalent[];
}

export interface RosterPage {
    items: RosterRow[];
    total: number;
}

export interface RosterOption {
    id: number;
    name: string;
}

export interface RosterOptions {
    employees: { id: number; code: string; name: string }[];
    departments: (RosterOption & { category_sort_order: number })[];
    jobs: RosterOption[];
    statuses: RosterOption[];
    talent_statuses: RosterOption[];
    talent_periods: RosterOption[];
}

export interface RosterParams {
    page: number;
    page_size: number;
    department_id?: number;
    subdepartment_id?: number;
    job_id?: number;
    status_id?: number;
    employee_id?: number;
    q?: string;
    has_talent?: boolean;
    talent_status_id?: number;
    talent_period_id?: number;
    sort_field?: string;
    sort_desc?: boolean;
}

export const fetchTalentRoster = async (params: RosterParams): Promise<RosterPage> => {
    const res = await axiosInstance.get<RosterPage>(`${BASE}/roster`, { params });
    return res.data ?? { items: [], total: 0 };
};

export const fetchTalentRosterOptions = async (
    departmentId: number | null,
): Promise<RosterOptions> => {
    const res = await axiosInstance.get<RosterOptions>(`${BASE}/roster_options`, {
        params: departmentId == null ? undefined : { department_id: departmentId },
    });
    return res.data;
};
