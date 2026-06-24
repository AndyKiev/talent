// src/components/admin/department_types/departmentTypeApi.ts
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums.ts';

const BASE = `${BASE_URL}/admin/department_types`;

export interface DepartmentType {
    id: number;
    name: string;
    description: string | null;
    is_active: boolean;
    created_at: string;
    // Enriched by the list endpoint (GET /admin/department_types):
    parent_names: string[];
    job_count: number;
}

export interface DepartmentTypeCreate {
    name: string;
    description?: string | null;
    is_active: boolean;
}

export interface DepartmentTypeUpdate {
    name?: string;
    description?: string | null;
    is_active?: boolean;
}

export interface MutationResponse<T> {
    detail: string;
    data: T;
}

export const fetchDepartmentTypes = async (): Promise<DepartmentType[]> => {
    const res = await axiosInstance.get<DepartmentType[]>(BASE);
    return res.data ?? [];
};

export const createDepartmentType = async (
    body: DepartmentTypeCreate,
): Promise<MutationResponse<DepartmentType>> => {
    const res = await axiosInstance.post<MutationResponse<DepartmentType>>(BASE, body);
    return res.data;
};

export const updateDepartmentType = async ({
    id,
    data,
}: {
    id: number;
    data: DepartmentTypeUpdate;
}): Promise<MutationResponse<DepartmentType>> => {
    const res = await axiosInstance.patch<MutationResponse<DepartmentType>>(`${BASE}/${id}`, data);
    return res.data;
};

export const deleteDepartmentType = async (id: number): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${BASE}/${id}`);
    return res.data;
};
