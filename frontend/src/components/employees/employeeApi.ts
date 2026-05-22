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

// ── Core shapes ───────────────────────────────────────────────────────────────

export interface Employee {
    id: number;
    code: string;
    name: string;
    email: string | null;
    is_active: boolean;
    job_id: number;
    lang_id: number;
    created_at: string;
    groups: string[];
    operations: string[];
    job: Job | null;
    lang: Lang | null;
    main_departments: MainDepartment[];
    extra_departments: MainDepartment[]
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

export const deleteEmployee = async (id: number): Promise<{ detail: string }> => {
    const res = await axiosInstance.delete<{ detail: string }>(`${BASE}/${id}`);
    return res.data;
};

// ── Main department slim shape (mirrors backend MainDepartmentSchema) ──────────

export interface MainDepartment {
    id: number;           // EmployeeDepartment link id
    department_id: number;
    name: string;
}