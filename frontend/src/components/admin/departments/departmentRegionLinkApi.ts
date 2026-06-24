// src/components/admin/departments/departmentRegionLinkApi.ts
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums';
import type { Region } from '../regions/regionApi';

const BASE = `${BASE_URL}/department_region_links`;

export interface DepartmentRegionLink {
    id: number;
    department_id: number;
    region_id: number;
    is_active: boolean;
    created_at: string;
    region: Region | null;
}

export interface DepartmentRegionLinkCreate {
    department_id: number;
    region_id: number;
    is_active: boolean;
}

export interface DepartmentRegionLinkUpdate {
    region_id?: number;
    is_active?: boolean;
}

export interface MutationResponse<T> {
    detail: string;
    data: T;
}

export const fetchDepartmentRegionLinks = async (
    params?: { department_id?: number; region_id?: number; is_active?: boolean },
): Promise<DepartmentRegionLink[]> => {
    const res = await axiosInstance.get<DepartmentRegionLink[]>(BASE, { params });
    return res.data ?? [];
};

export const createDepartmentRegionLink = async (
    body: DepartmentRegionLinkCreate,
): Promise<MutationResponse<DepartmentRegionLink>> => {
    const res = await axiosInstance.post<MutationResponse<DepartmentRegionLink>>(BASE, body);
    return res.data;
};

export const updateDepartmentRegionLink = async ({
    id,
    data,
}: {
    id: number;
    data: DepartmentRegionLinkUpdate;
}): Promise<MutationResponse<DepartmentRegionLink>> => {
    const res = await axiosInstance.patch<MutationResponse<DepartmentRegionLink>>(`${BASE}/${id}`, data);
    return res.data;
};

export const deleteDepartmentRegionLink = async (id: number): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${BASE}/${id}`);
    return res.data;
};
