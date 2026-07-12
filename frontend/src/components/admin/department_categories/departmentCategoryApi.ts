// src/components/admin/department_categories/departmentCategoryApi.ts
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums.ts';

const BASE = `${BASE_URL}/admin/department_categories`;

export interface DepartmentCategory {
    id: number;
    name: string;
    key: string | null;
    description: string | null;
    is_active: boolean;
    is_main: boolean;
    is_responsibility: boolean;
    sort_order: number;
    created_at: string;
}

export interface DepartmentCategoryCreate {
    name: string;
    key?: string | null;
    description?: string | null;
    is_active: boolean;
    is_main: boolean;
    is_responsibility: boolean;
}

export interface DepartmentCategoryUpdate {
    name?: string;
    key?: string | null;
    description?: string | null;
    is_active?: boolean;
    is_main?: boolean;
    is_responsibility?: boolean;
    sort_order?: number;
}

export interface MutationResponse<T> {
    detail: string;
    data: T;
}

export const fetchDepartmentCategories = async (
    params?: { is_main?: boolean; is_active?: boolean },
): Promise<DepartmentCategory[]> => {
    const res = await axiosInstance.get<DepartmentCategory[]>(BASE, { params });
    return res.data ?? [];
};

export const createDepartmentCategory = async (
    body: DepartmentCategoryCreate,
): Promise<MutationResponse<DepartmentCategory>> => {
    const res = await axiosInstance.post<MutationResponse<DepartmentCategory>>(BASE, body);
    return res.data;
};

export const updateDepartmentCategory = async ({
    id,
    data,
}: {
    id: number;
    data: DepartmentCategoryUpdate;
}): Promise<MutationResponse<DepartmentCategory>> => {
    const res = await axiosInstance.patch<MutationResponse<DepartmentCategory>>(`${BASE}/${id}`, data);
    return res.data;
};

export const deleteDepartmentCategory = async (id: number): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${BASE}/${id}`);
    return res.data;
};
