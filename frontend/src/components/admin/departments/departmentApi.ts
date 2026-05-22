// src/components/admin/departments/departmentApi.ts
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums';

const BASE = `${BASE_URL}/departments`;

// ── Nested types ──────────────────────────────────────────────────────────────

export interface DepartmentCategory {
    id: number;
    name: string;
}

export interface DepartmentType {
    id: number;
    name: string;
}

// ── Core shapes ───────────────────────────────────────────────────────────────

export interface DepartmentFlat {
    id: number;
    name: string;
    is_active: boolean;
    parent_id: number | null;
    department_category_id: number;
    department_type_id: number;
    department_category: DepartmentCategory | null;
    department_type: DepartmentType | null;
    created_at: string;
}

export interface DepartmentNode extends DepartmentFlat {
    children: DepartmentNode[];
}

export interface DepartmentCreate {
    name: string;
    is_active: boolean;
    parent_id: number | null;
    department_category_id: number;
    department_type_id: number;
}

export interface DepartmentUpdate {
    name?: string;
    is_active?: boolean;
    parent_id?: number | null;
    department_category_id?: number;
    department_type_id?: number;
}

export interface MutationResponse<T> {
    detail: string;
    data: T;
}

// ── API functions ─────────────────────────────────────────────────────────────

export const fetchDepartmentTree = async (): Promise<DepartmentNode[]> => {
    const res = await axiosInstance.get<DepartmentNode[]>(`${BASE}/tree`);
    return res.data ?? [];
};

/**
 * Root departments (parent_id IS NULL).
 * Used to decide whether the "Add Root Department" button is visible.
 */
export const fetchRootDepartments = async (): Promise<DepartmentFlat[]> => {
    const res = await axiosInstance.get<DepartmentFlat[]>(`${BASE}/roots`);
    return res.data ?? [];
};

export const fetchDepartmentsFlat = async (): Promise<DepartmentFlat[]> => {
    const res = await axiosInstance.get<DepartmentFlat[]>(BASE);
    return res.data ?? [];
};

export const fetchDepartmentById = async (id: number): Promise<DepartmentNode> => {
    const res = await axiosInstance.get<DepartmentNode>(`${BASE}/${id}`);
    return res.data;
};

export const createDepartment = async (
    body: DepartmentCreate,
): Promise<MutationResponse<DepartmentNode>> => {
    const res = await axiosInstance.post<MutationResponse<DepartmentNode>>(BASE, body);
    return res.data;
};

export const updateDepartment = async ({
    id,
    data,
}: {
    id: number;
    data: DepartmentUpdate;
}): Promise<MutationResponse<DepartmentNode>> => {
    const res = await axiosInstance.patch<MutationResponse<DepartmentNode>>(`${BASE}/${id}`, data);
    return res.data;
};

export const deleteDepartment = async (id: number): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${BASE}/${id}`);
    return res.data;
};

// ── Department types (for selects) ────────────────────────────────────────────

export const fetchDepartmentTypes = async (): Promise<DepartmentType[]> => {
    const res = await axiosInstance.get<DepartmentType[]>(`${BASE_URL}/admin/department_types`);
    return res.data ?? [];
};

/**
 * Child department types linked to a given parent type.
 * Used to constrain the type select when creating/editing departments.
 */
export const fetchChildrenByParentType = async (
    parentTypeId: number,
): Promise<DepartmentType[]> => {
    const res = await axiosInstance.get<DepartmentType[]>(
        `${BASE_URL}/admin/department_types/${parentTypeId}/children`,
    );
    return res.data ?? [];
};
