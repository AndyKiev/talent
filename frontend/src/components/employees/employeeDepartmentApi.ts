// src/components/employees/employeeDepartmentApi.ts
import { axiosInstance } from '../../api/axiosInstance';
import { BASE_URL } from '../../utils/eNums';
import type { TopOrgUnit } from './employeeApi';

const base = (employeeId: number) => `${BASE_URL}/employees/${employeeId}/departments`;

// ── Shapes ────────────────────────────────────────────────────────────────────

export interface DepartmentFlat {
    id: number;
    name: string;
    department_type_id: number;
    department_category_id: number;
    department_type: { id: number; name: string } | null;
    department_category: { id: number; name: string } | null;
}

export interface EmployeeDepartment {
    id: number;
    employee_id: number;
    department_id: number;
    is_main: boolean;
    created_at: string;
    department: DepartmentFlat | null;
    // Derived top-level org unit (board / directorate / store) for this dept.
    top_department: TopOrgUnit | null;
}

export interface EmployeeDepartmentCreate {
    department_id: number;
    is_main: boolean;
}

export interface MutationResponse<T> {
    detail: string;
    data: T;
}

export interface EmployeeDepartmentCount {
    employee_id: number;
    count: number;
}

// ── API functions ─────────────────────────────────────────────────────────────

export const fetchEmployeeDepartments = async (
    employeeId: number,
): Promise<EmployeeDepartment[]> => {
    const res = await axiosInstance.get<EmployeeDepartment[]>(base(employeeId));
    return res.data ?? [];
};

export const countEmployeeDepartments = async (
    employeeId: number,
): Promise<EmployeeDepartmentCount> => {
    const res = await axiosInstance.get<EmployeeDepartmentCount>(`${base(employeeId)}/count`);
    return res.data;
};

export const createEmployeeDepartment = async (
    employeeId: number,
    body: EmployeeDepartmentCreate,
): Promise<MutationResponse<EmployeeDepartment>> => {
    const res = await axiosInstance.post<MutationResponse<EmployeeDepartment>>(
        base(employeeId),
        body,
    );
    return res.data;
};

export const deleteEmployeeDepartment = async (
    employeeId: number,
    linkId: number,
): Promise<{ detail: string }> => {
    const res = await axiosInstance.delete<{ detail: string }>(
        `${base(employeeId)}/${linkId}`,
    );
    return res.data;
};
