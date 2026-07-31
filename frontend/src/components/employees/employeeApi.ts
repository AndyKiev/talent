// src/components/employees/employeeApi.ts
import { axiosInstance } from '../../api/axiosInstance';
import { BASE_URL } from '../../utils/eNums';
import type { PersonSex } from '../admin/persons/personApi';

const BASE = `${BASE_URL}/employees`;

// ── Nested types ──────────────────────────────────────────────────────────────

export interface Job {
    id: number;
    name: string;
}

export interface Lang {
    id: number;
    name: string;
}

// Derived top-level org unit (board / directorate / store), resolved by the
// backend by walking up the department tree from the actual department.
export interface TopOrgUnit {
    id: number;
    name: string;
}

// ── Core shapes ───────────────────────────────────────────────────────────────

// Slim person info nested in Employee (mirrors backend EmployeePersonSlim).
export interface EmployeePerson {
    id: number;
    first_name: string | null;
    last_name: string | null;
    patronymic: string | null;
    sex: PersonSex | null;
    birth_date: string | null;
}

export interface Employee {
    id: number;
    code: string;
    // Read-only. There is no employees.name column: the backend composes this
    // from the person's parts in THIS user's preferred order
    // (`surname_first_in_names`), so it changes when that setting changes.
    name: string;
    email: string | null;
    is_active: boolean;
    status_id: number | null;        // ADD
    status: { id: number; name: string } | null;  // ADD
    job_id: number | null;           // CHANGE: was number
    lang_id: number;
    created_at: string;
    person_id: number | null;
    person: EmployeePerson | null;
    groups: string[];
    operations: string[];
    job: Job | null;
    lang: Lang | null;
    main_department: MainDepartment | null;
    responsibility_departments: MainDepartment[];
}

// NOTE: no `name` — it is never an input. Rename via PATCH /persons/{id}.
export interface EmployeeUpdate {
    email?: string | null;
    is_active?: boolean;
}

// ── Employee CRUD ─────────────────────────────────────────────────────────────

export const fetchEmployees = async (): Promise<Employee[]> => {
    const res = await axiosInstance.get<Employee[]>(BASE);
    return res.data ?? [];
};

export const fetchEmployeeById = async (id: number): Promise<Employee> => {
    const res = await axiosInstance.get<Employee>(`${BASE}/${id}`);
    return res.data;
};

export const updateEmployee = async ({
                                         id,
                                         data,
                                     }: {
    id: number;
    data: EmployeeUpdate;
}): Promise<Employee> => {
    const res = await axiosInstance.patch<Employee>(`${BASE}/${id}`, data);
    return res.data;
};

export const updateEmployeeJob = async ({
                                            id,
                                            job_id,
                                        }: {
    id: number;
    job_id: number;
}): Promise<Employee> => {
    const res = await axiosInstance.patch<Employee>(`${BASE}/${id}/job/${job_id}`);
    return res.data;
};

export const deleteEmployee = async (
    id: number,
    force = false,
): Promise<{ detail: string }> => {
    const res = await axiosInstance.delete<{ detail: string }>(
        `${BASE}/${id}`,
        { params: force ? { force: true } : undefined },
    );
    return res.data;
};

// ── Scope-filter Select (main / top departments) ──────────────────────────────

// A main department option for the employees-page filter Select. Already ordered by
// the backend: store (by region sort_order) -> directorate -> other.
// Only active main departments (category is_main=True) are returned.
export interface ScopeDepartment {
    id: number;
    name: string;
    category_key: string | null;
    category_name: string | null;
}

export const fetchScopeDepartments = async (): Promise<ScopeDepartment[]> => {
    const res = await axiosInstance.get<ScopeDepartment[]>(`${BASE}/scope_departments`);
    return res.data ?? [];
};

// Employees filtered to one department's subtree (intersected with caller scope).
export const fetchEmployeesByDepartment = async (
    departmentId: number,
): Promise<Employee[]> => {
    const res = await axiosInstance.get<Employee[]>(BASE, {
        params: { department_id: departmentId },
    });
    return res.data ?? [];
};

// ── Main department slim shape (mirrors backend MainDepartmentSchema) ──────────

export interface MainDepartment {
    id: number;           // link-row id
    // main_department carries a department INSTANCE; responsibility_departments
    // carry a department TYPE — exactly one of these ids is set.
    department_id?: number | null;
    department_type_id?: number | null;
    name: string;
    // Derived top-level org unit (board / directorate / store) for this dept.
    top_department: TopOrgUnit | null;
    // Department category sort_order, used to sort closest-department filter options.
    department_category_sort_order: number;
}
