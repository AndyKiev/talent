// src/components/employees/employeeApi.ts
import { axiosInstance } from '../../api/axiosInstance';
import { BASE_URL } from '../../utils/eNums';

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

export interface Employee {
    id: number;
    code: string;
    name: string;
    email: string | null;
    is_active: boolean;
    status_id: number | null;        // ADD
    status: { id: number; name: string } | null;  // ADD
    job_id: number | null;           // CHANGE: was number
    lang_id: number;
    created_at: string;
    groups: string[];
    operations: string[];
    job: Job | null;
    lang: Lang | null;
    main_departments: MainDepartment[];
    extra_departments: MainDepartment[];
}

export interface EmployeeCreate {
    code: string;
    name: string;
    email?: string | null;
    is_active: boolean;
    job_id: number;
    lang_id: number;
}

export interface EmployeeUpdate {
    name?: string;
    email?: string | null;
    is_active?: boolean;
}

export interface MutationResponse<T> {
    detail: string;
    data: T;
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

export const createEmployee = async (body: EmployeeCreate): Promise<Employee> => {
    const res = await axiosInstance.post<Employee>(BASE, body);
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
    id: number;           // EmployeeDepartment link id
    department_id: number;
    name: string;
    // Derived top-level org unit (board / directorate / store) for this dept.
    top_department: TopOrgUnit | null;
    // Department category sort_order, used to sort closest-department filter options.
    department_category_sort_order: number;
}
