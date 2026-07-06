// src/components/admin/user_group_types/userGroupTypeApi.ts
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from "../../../utils/eNums.ts";

const BASE = `${BASE_URL}/admin/user_group_types`;

export interface UserGroupType {
    id: number;
    name: string;
    description: string | null;
    created_at: string;
    groups?: string[]; // Names of UserGroups linked to this type
}

export interface UserGroupTypeCreate {
    name: string;
    description?: string | null;
}

export interface UserGroupTypeUpdate {
    name?: string;
    description?: string | null;
}

export interface MutationResponse<T> {
    detail: string;
    data: T;
}

export const fetchUserGroupTypes = async (): Promise<UserGroupType[]> => {
    const res = await axiosInstance.get<UserGroupType[]>(BASE);
    return res.data ?? [];
};

export const createUserGroupType = async (
    body: UserGroupTypeCreate,
): Promise<MutationResponse<UserGroupType>> => {
    const res = await axiosInstance.post<MutationResponse<UserGroupType>>(BASE, body);
    return res.data;
};

export const updateUserGroupType = async ({
                                              id,
                                              data,
                                          }: {
    id: number;
    data: UserGroupTypeUpdate;
}): Promise<MutationResponse<UserGroupType>> => {
    const res = await axiosInstance.patch<MutationResponse<UserGroupType>>(`${BASE}/${id}`, data);
    return res.data;
};

export const deleteUserGroupType = async (id: number): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${BASE}/${id}`);
    return res.data;
};