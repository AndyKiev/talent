// src/components/admin/department_types/departmentTypeParentalLinkApi.ts
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums';

const BASE = `${BASE_URL}/admin/department_type_parental_links`;
const TYPES_BASE = `${BASE_URL}/admin/department_types`;

export interface DepartmentTypeChild {
    id: number;
    name: string;
    description: string | null;
    is_active: boolean;
    created_at: string;
    parent_id: number | null;
    link_id: number | null;
}

export interface ParentalLinkCreate {
    child_id: number;
    parent_id: number;
    is_active?: boolean;
}

export interface MutationResponse<T> {
    detail: string;
    data: T;
}

export const fetchChildrenByParent = async (parentId: number): Promise<DepartmentTypeChild[]> => {
    const res = await axiosInstance.get<DepartmentTypeChild[]>(
        `${TYPES_BASE}/${parentId}/children`,
    );
    return res.data ?? [];
};

export const createParentalLink = async (
    body: ParentalLinkCreate,
): Promise<MutationResponse<unknown>> => {
    const res = await axiosInstance.post<MutationResponse<unknown>>(BASE, body);
    return res.data;
};

export const deleteParentalLink = async (
    linkId: number,
): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${BASE}/${linkId}`);
    return res.data;
};
