// src/components/admin/departments/departmentApi.ts
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums';
import type { MutationResponse } from '../../../types/mutationResponse';
export type { MutationResponse };

const BASE = `${BASE_URL}/departments`;

// ── Nested types ──────────────────────────────────────────────────────────────

export interface DepartmentCategory {
    id: number;
    name: string;
    key: string | null;
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

export interface DepartmentSubtreeGenerateResult {
    detail: string;
    root_id: number;
    created_count: number;
    created: DepartmentFlat[];
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

/**
 * Recursively create missing department instances below `id`, following the
 * department-type parental graph (active links only). Idempotent — existing
 * children of a given type are reused. Runs server-side in one transaction.
 */
export const generateDepartmentSubtree = async (
    id: number,
): Promise<DepartmentSubtreeGenerateResult> => {
    const res = await axiosInstance.post<DepartmentSubtreeGenerateResult>(
        `${BASE}/${id}/generate_subtree`,
    );
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

/**
 * Whole {parent_type_id: [child_type_id, ...]} map from active parental links,
 * in ONE request. The department tree uses it to resolve allowed types for
 * every node without a per-parent-type API call.
 */
export const fetchDepartmentTypeChildMap = async (): Promise<
    Record<number, number[]>
> => {
    const res = await axiosInstance.get<Record<number, number[]>>(
        `${BASE_URL}/admin/department_type_parental_links/child_map`,
    );
    return res.data ?? {};
};
