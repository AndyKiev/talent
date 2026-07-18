// src/components/admin/user_group_types/userGroupTypeApi.ts
import { BASE_URL } from "../../../utils/eNums.ts";
import type { MutationResponse } from '../../../types/mutationResponse';
export type { MutationResponse };
import { createCrudApi } from '../../../api/createCrudApi';

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

const crud = createCrudApi<UserGroupType, UserGroupTypeCreate, UserGroupTypeUpdate>(BASE);

export const fetchUserGroupTypes = crud.fetchList;

export const createUserGroupType = crud.create;

export const updateUserGroupType = crud.update;

export const deleteUserGroupType = crud.remove;