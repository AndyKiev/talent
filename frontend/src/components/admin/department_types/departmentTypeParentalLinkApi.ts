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
    /** is_active of the parental link itself (distinct from the type's own is_active). */
    link_is_active: boolean | null;
}

/** A raw parental-link row. */
export interface ParentalLink {
    id: number;
    child_id: number;
    parent_id: number;
    is_active: boolean;
    created_at: string;
}

export interface ParentalLinkCreate {
    child_id: number;
    parent_id: number;
    is_active?: boolean;
}

export interface ParentalLinkUpdate {
    child_id?: number;
    parent_id?: number;
    is_active?: boolean;
}

export interface MutationResponse<T> {
    detail: string;
    data: T;
}

/**
 * Fetch ALL parental links, optionally filtered by is_active.
 * Used to build the full child → parent graph on the client.
 */
export const fetchParentalLinks = async (
    isActive?: boolean,
): Promise<ParentalLink[]> => {
    const params: Record<string, string> = {};
    if (isActive !== undefined) params.is_active = String(isActive);
    const res = await axiosInstance.get<ParentalLink[]>(BASE, { params });
    return res.data ?? [];
};

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

export const updateParentalLink = async ({
    linkId,
    data,
}: {
    linkId: number;
    data: ParentalLinkUpdate;
}): Promise<MutationResponse<unknown>> => {
    const res = await axiosInstance.patch<MutationResponse<unknown>>(`${BASE}/${linkId}`, data);
    return res.data;
};

export const deleteParentalLink = async (
    linkId: number,
): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${BASE}/${linkId}`);
    return res.data;
};
