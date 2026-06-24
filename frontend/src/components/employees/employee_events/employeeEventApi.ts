// src/components/employees/employee_events/employeeEventApi.ts
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EmployeeEventStatusSchema {
    id: number;
    name: string;
    description?: string | null;
}

export interface EmployeeEventDirectionType {
    id: number;
    code: string;
    name: string;
}

export interface EmployeeEventTypeDirectionNested {
    id: number;
    direction_type_id: number;
    is_required: boolean;
    sort_order: number;
    direction_type?: EmployeeEventDirectionType | null;
}

export interface EmployeeEventType {
    id: number;
    code: string;
    name: string;
    description?: string | null;
    type_directions?: EmployeeEventTypeDirectionNested[];
}

export interface EmployeeEventChangeDepartment {
    id: number;
    department_id: number;
    change_dept_type_id: number;
    department?: { id: number; name: string } | null;
}

export interface EmployeeEventChange {
    id: number;
    event_id: number;
    direction_type_id: number;
    direction_type?: EmployeeEventDirectionType | null;
    prev_job_id?: number | null;
    new_job_id?: number | null;
    prev_status_id?: number | null;
    new_status_id?: number | null;
    prev_department_id?: number | null;
    new_department_id?: number | null;
    prev_job?: { id: number; name: string } | null;
    new_job?: { id: number; name: string } | null;
    prev_status?: { id: number; name: string } | null;
    new_status?: { id: number; name: string } | null;
    prev_department?: { id: number; name: string } | null;
    new_department?: { id: number; name: string } | null;
    dept_changes?: EmployeeEventChangeDepartment[];
}

export interface EmployeeEventFlat {
    id: number;
    employee_id: number;
    event_type_id: number;
    status_id: number;
    effective_date: string;
    description?: string | null;
    created_by: number;
    created_at: string;
    event_type?: EmployeeEventType | null;
    status?: EmployeeEventStatusSchema | null;
}

export interface EmployeeEventFull extends EmployeeEventFlat {
    changes: EmployeeEventChange[];
}

export interface EmployeeEventCreate {
    event_type_id: number;
    status_id: number;
    effective_date: string;
    description?: string | null;
    changes?: unknown[];
}

export interface EmployeeEventUpdate {
    status_id?: number | null;
    effective_date?: string | null;
    description?: string | null;
}

export interface EmployeeEventChangeCreate {
    direction_type_id: number;
    prev_job_id?: number | null;
    new_job_id?: number | null;
    prev_status_id?: number | null;
    new_status_id?: number | null;
    prev_department_id?: number | null;
    new_department_id?: number | null;
    dept_changes?: { department_id: number; change_dept_type_id: number }[];
}

// ── Event API calls ───────────────────────────────────────────────────────────

const base = (employeeId: number) => `${BASE_URL}/employees/${employeeId}/events`;

export const fetchEmployeeEvents = async (
    employeeId: number,
): Promise<EmployeeEventFlat[]> => {
    const res = await axiosInstance.get<EmployeeEventFlat[]>(base(employeeId));
    return res.data ?? [];
};

export interface ResponsibilityHistoryEntry {
    effective_date: string;
    event_type: string | null;
    event_type_code: string | null;
    departments: { id: number; name: string | null }[];
}

export const fetchResponsibilityHistory = async (
    employeeId: number,
): Promise<ResponsibilityHistoryEntry[]> => {
    const res = await axiosInstance.get<ResponsibilityHistoryEntry[]>(
        `${BASE_URL}/employees/${employeeId}/responsibility_history`,
    );
    return res.data ?? [];
};

export const fetchEmployeeEvent = async (
    employeeId: number,
    eventId: number,
): Promise<EmployeeEventFull> => {
    const res = await axiosInstance.get<EmployeeEventFull>(
        `${base(employeeId)}/${eventId}`,
    );
    return res.data;
};

export const createEmployeeEvent = async (
    employeeId: number,
    payload: EmployeeEventCreate,
): Promise<EmployeeEventFlat> => {
    const res = await axiosInstance.post(base(employeeId), payload);
    return res.data.record ?? res.data;
};

export const updateEmployeeEvent = async (
    employeeId: number,
    eventId: number,
    payload: EmployeeEventUpdate,
): Promise<EmployeeEventFlat> => {
    const res = await axiosInstance.patch(
        `${base(employeeId)}/${eventId}`,
        payload,
    );
    return res.data.record ?? res.data;
};

export const deleteEmployeeEvent = async (
    employeeId: number,
    eventId: number,
): Promise<void> => {
    await axiosInstance.delete(`${base(employeeId)}/${eventId}`);
};

export const applyEmployeeEvent = async (
    employeeId: number,
    eventId: number,
    appliedStatusId: number,
): Promise<EmployeeEventFlat> => {
    const res = await axiosInstance.post(
        `${base(employeeId)}/${eventId}/apply`,
        null,
        { params: { applied_status_id: appliedStatusId } },
    );
    return res.data.record ?? res.data;
};

// Step the event's status one stage BACKWARD: applied -> ready -> draft.
// Only valid on the latest event; un-applying (applied -> ready) unwinds the
// same job / main-dept / talent side effects as delete (event row is kept).
export const revertEmployeeEvent = async (
    employeeId: number,
    eventId: number,
): Promise<EmployeeEventFlat> => {
    const res = await axiosInstance.post(
        `${base(employeeId)}/${eventId}/revert`,
        null,
    );
    return res.data.record ?? res.data;
};

// ── Change endpoints ──────────────────────────────────────────────────────────

const changesBase = (employeeId: number, eventId: number) =>
    `${BASE_URL}/employees/${employeeId}/events/${eventId}/changes`;

export const fetchEventChanges = async (
    employeeId: number,
    eventId: number,
): Promise<EmployeeEventChange[]> => {
    const res = await axiosInstance.get<EmployeeEventChange[]>(
        changesBase(employeeId, eventId),
    );
    return res.data ?? [];
};

export const createEventChange = async (
    employeeId: number,
    eventId: number,
    payload: EmployeeEventChangeCreate,
): Promise<EmployeeEventChange> => {
    const res = await axiosInstance.post(
        changesBase(employeeId, eventId),
        payload,
    );
    return res.data.record ?? res.data.data ?? res.data;
};

export const deleteEventChange = async (
    employeeId: number,
    eventId: number,
    changeId: number,
): Promise<void> => {
    await axiosInstance.delete(
        `${changesBase(employeeId, eventId)}/${changeId}`,
    );
};

// ── Lookup fetchers ───────────────────────────────────────────────────────────

export const fetchEmployeeEventStatuses = async (): Promise<EmployeeEventStatusSchema[]> => {
    const res = await axiosInstance.get<EmployeeEventStatusSchema[]>(
        `${BASE_URL}/admin/employee_events/employee_event_statuses`,
    );
    return res.data ?? [];
};

export const fetchEmployeeEventTypes = async (): Promise<EmployeeEventType[]> => {
    const res = await axiosInstance.get<EmployeeEventType[]>(
        `${BASE_URL}/admin/employee_events/employee_event_types`,
    );
    return res.data ?? [];
};

export const fetchEmployeeEventTypeDirections = async (
    eventTypeId: number,
): Promise<EmployeeEventTypeDirectionNested[]> => {
    const res = await axiosInstance.get<EmployeeEventTypeDirectionNested[]>(
        `${BASE_URL}/employee_event_types/${eventTypeId}/directions`,
    );
    return res.data ?? [];
};

// ── Jobs, statuses, departments lookups ───────────────────────────────────────

export interface JobOption {
    id: number;
    name: string;
}

export interface EmployeeStatusOption {
    id: number;
    name: string;
}

export interface DepartmentOption {
    id: number;
    name: string;
    department_type_id: number;
}

export interface DepartmentCategoryOption {
    id: number;
    name: string;
    is_main: boolean;
}

export const fetchJobs = async (): Promise<JobOption[]> => {
    const res = await axiosInstance.get<JobOption[]>(`${BASE_URL}/jobs`);
    return res.data ?? [];
};

export const fetchEmployeeStatuses = async (): Promise<EmployeeStatusOption[]> => {
    const res = await axiosInstance.get<EmployeeStatusOption[]>(
        `${BASE_URL}/employee_status`,
    );
    return res.data ?? [];
};

export const fetchDepartments = async (): Promise<DepartmentOption[]> => {
    const res = await axiosInstance.get<DepartmentOption[]>(
        `${BASE_URL}/departments`,
    );
    return res.data ?? [];
};

export const fetchDepartmentsByCategory = async (
    categoryId: number,
): Promise<DepartmentOption[]> => {
    const res = await axiosInstance.get<DepartmentOption[]>(
        `${BASE_URL}/departments`,
        { params: { department_category_id: categoryId, is_active: true } },
    );
    return res.data ?? [];
};

export const fetchMainDepartmentCategories = async (): Promise<DepartmentCategoryOption[]> => {
    const res = await axiosInstance.get<DepartmentCategoryOption[]>(
        `${BASE_URL}/admin/department_categories`,
        { params: { is_main: true, is_active: true } },
    );
    return res.data ?? [];
};

// Responsibility categories valid for a job (with is_main=false fallback).
export interface ResponsibilityCategoryOption {
    id: number;
    name: string;
    is_main: boolean;
    is_fallback: boolean;
}

export const fetchResponsibilityCategoriesForJob = async (
    jobId: number,
): Promise<ResponsibilityCategoryOption[]> => {
    const res = await axiosInstance.get<ResponsibilityCategoryOption[]>(
        `${BASE_URL}/job_responsibility_category_links/by_job/${jobId}/categories`,
    );
    return res.data ?? [];
};

// Change-dept-type lookup (MAIN_DEPT / RESPONSIBILITY_DEPT) for dept_changes rows.
export interface ChangeDeptTypeOption {
    id: number;
    code: string;
    name: string;
}

export const fetchChangeDeptTypes = async (): Promise<ChangeDeptTypeOption[]> => {
    const res = await axiosInstance.get<ChangeDeptTypeOption[]>(
        `${BASE_URL}/admin/employee_events/employee_event_change_dept_types`,
    );
    return res.data ?? [];
};

// Jobs valid for a given department TYPE (via department_type_job_links).
export interface JobByDeptType {
    id: number;
    name: string;
    link_id: number;
    link_is_active: boolean;
}

export const fetchJobsByDepartmentType = async (
    departmentTypeId: number,
): Promise<JobByDeptType[]> => {
    const res = await axiosInstance.get<JobByDeptType[]>(
        `${BASE_URL}/department_type_job_links/by_department_type/${departmentTypeId}/jobs`,
        { params: { is_active: true } },
    );
    return res.data ?? [];
};
