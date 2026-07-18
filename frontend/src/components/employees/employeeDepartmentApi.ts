// src/components/employees/employeeDepartmentApi.ts
//
// Two link tables behind two nested routers:
//   /employees/{id}/departments                — the single MAIN department
//   /employees/{id}/responsibility_departments — departments of responsibility
import { axiosInstance } from '../../api/axiosInstance';
import { BASE_URL } from '../../utils/eNums';
import type { TopOrgUnit } from './employeeApi';
import type { MutationResponse } from '../../types/mutationResponse';
export type { MutationResponse };

const base = (employeeId: number) => `${BASE_URL}/employees/${employeeId}/departments`;
const respBase = (employeeId: number) =>
    `${BASE_URL}/employees/${employeeId}/responsibility_departments`;

// ── Shapes ────────────────────────────────────────────────────────────────────

export interface DepartmentFlat {
    id: number;
    name: string;
    department_type_id: number;
    department_category_id: number;
    department_type: { id: number; name: string } | null;
    department_category: { id: number; name: string } | null;
}

// The MAIN link carries a department INSTANCE; the RESPONSIBILITY link carries a
// department TYPE — so only the fields for the relevant kind are populated.
export interface EmployeeDepartment {
    id: number;
    employee_id: number;
    created_at: string;
    // MAIN link (department instance)
    department_id?: number;
    department?: DepartmentFlat | null;
    // Derived top-level org unit (board / directorate / store) for the instance.
    top_department?: TopOrgUnit | null;
    // RESPONSIBILITY link (department type)
    department_type_id?: number;
    department_type?: { id: number; name: string } | null;
}

export interface EmployeeDepartmentCreate {
    department_id: number;
}

export interface EmployeeResponsibilityDepartmentCreate {
    department_type_id: number;
}

// ── Main department (0..1 per employee) ──────────────────────────────────────

export const fetchEmployeeDepartments = async (
    employeeId: number,
): Promise<EmployeeDepartment[]> => {
    const res = await axiosInstance.get<EmployeeDepartment[]>(base(employeeId));
    return res.data ?? [];
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

// ── Responsibility departments (0..N per employee) ───────────────────────────

export const fetchEmployeeResponsibilityDepartments = async (
    employeeId: number,
): Promise<EmployeeDepartment[]> => {
    const res = await axiosInstance.get<EmployeeDepartment[]>(respBase(employeeId));
    return res.data ?? [];
};

export const createEmployeeResponsibilityDepartment = async (
    employeeId: number,
    body: EmployeeResponsibilityDepartmentCreate,
): Promise<MutationResponse<EmployeeDepartment>> => {
    const res = await axiosInstance.post<MutationResponse<EmployeeDepartment>>(
        respBase(employeeId),
        body,
    );
    return res.data;
};

export const deleteEmployeeResponsibilityDepartment = async (
    employeeId: number,
    linkId: number,
): Promise<{ detail: string }> => {
    const res = await axiosInstance.delete<{ detail: string }>(
        `${respBase(employeeId)}/${linkId}`,
    );
    return res.data;
};
