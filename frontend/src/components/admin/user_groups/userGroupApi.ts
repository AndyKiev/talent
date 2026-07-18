// src/components/admin/user_groups/userGroupApi.ts
import { BASE_URL } from '../../../utils/eNums';
import type { MutationResponse } from '../../../types/mutationResponse';
export type { MutationResponse };
import { createCrudApi } from '../../../api/createCrudApi';

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

const crud = createCrudApi<UserGroup, UserGroupCreate, UserGroupUpdate>(BASE);

export const fetchUserGroups = crud.fetchList;

export const createUserGroup = crud.create;

export const updateUserGroup = crud.update;

// DELETE /user_groups/{id} → 204 No Content, no response body
export const deleteUserGroup = crud.remove;
