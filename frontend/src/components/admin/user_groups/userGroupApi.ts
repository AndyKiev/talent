// src/components/admin/user_groups/userGroupApi.ts
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums';

const BASE = `${BASE_URL}/admin/user_groups`;

export interface UserGroup {
    id: number;
    name: string;
    description: string | null;
    is_protected: boolean;
    user_group_type_id: number;
    user_group_type_name: string | null;
    users_qty: { active: number; inactive: number } | null;
    /** IDs of OperationEssenceLink rows granted to this group (legacy grain) */
    oel_ids: number[];
    /** IDs of OperationEssenceSetLink rows granted to this group (set grain) */
    oesl_ids: number[];
}

export interface UserGroupCreate {
    name: string;
    description?: string | null;
    is_protected: boolean;
    user_group_type_id: number;
}

export interface UserGroupUpdate {
    name?: string;
    description?: string | null;
    is_protected?: boolean;
    user_group_type_id?: number;
}

export interface MutationResponse<T> {
    detail: string;
    data: T;
}

export const fetchUserGroups = async (): Promise<UserGroup[]> => {
    const res = await axiosInstance.get<UserGroup[]>(BASE);
    return res.data ?? [];
};

export const createUserGroup = async (
    body: UserGroupCreate,
): Promise<MutationResponse<UserGroup>> => {
    const res = await axiosInstance.post<MutationResponse<UserGroup>>(BASE, body);
    return res.data;
};

export const updateUserGroup = async ({
    id,
    data,
}: {
    id: number;
    data: UserGroupUpdate;
}): Promise<MutationResponse<UserGroup>> => {
    const res = await axiosInstance.patch<MutationResponse<UserGroup>>(`${BASE}/${id}`, data);
    return res.data;
};

// DELETE /user_groups/{id} → 204 No Content, no response body
export const deleteUserGroup = async (id: number): Promise<void> => {
    await axiosInstance.delete(`${BASE}/${id}`);
};
