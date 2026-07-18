// src/components/developer/process_roles/process_role/processRoleApi.ts
import { BASE_URL } from '../../../../utils/eNums.ts';
import type { MutationResponse } from '../../../../types/mutationResponse';
export type { MutationResponse };
import { createCrudApi } from '../../../../api/createCrudApi';

const BASE = `${BASE_URL}/admin/process_roles`;

export type LinkTarget = 'employee' | 'department';

export interface ProcessRole {
    id: number;
    process_id: number;
    name: string;
    short_name: string | null;
    key: string | null;
    is_active: boolean;
    created_at: string;
    process_name: string | null;
    link_target: LinkTarget;
}

export interface ProcessRoleCreate {
    process_id: number;
    name: string;
    short_name?: string | null;
    key?: string | null;
    is_active: boolean;
    link_target: LinkTarget;
}

export interface ProcessRoleUpdate {
    name?: string;
    short_name?: string | null;
    key?: string | null;
    is_active?: boolean;
    link_target?: LinkTarget;
}

const crud = createCrudApi<ProcessRole, ProcessRoleCreate, ProcessRoleUpdate, { process_id?: number; is_active?: boolean }>(BASE);

export const fetchProcessRoles = crud.fetchAll;

export const createProcessRole = crud.create;

export const updateProcessRole = crud.update;

export const deleteProcessRole = crud.remove;
