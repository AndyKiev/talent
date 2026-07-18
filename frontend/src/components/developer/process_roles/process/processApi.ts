// src/components/developer/process_roles/process/processApi.ts
import { BASE_URL } from '../../../../utils/eNums.ts';
import type { MutationResponse } from '../../../../types/mutationResponse';
export type { MutationResponse };
import { createCrudApi } from '../../../../api/createCrudApi';

const BASE = `${BASE_URL}/admin/processes`;

export interface Process {
    id: number;
    name: string;
    key: string | null;
    is_active: boolean;
    created_at: string;
}

export interface ProcessCreate {
    name: string;
    key?: string | null;
    is_active: boolean;
}

export interface ProcessUpdate {
    name?: string;
    key?: string | null;
    is_active?: boolean;
}

const crud = createCrudApi<Process, ProcessCreate, ProcessUpdate, { is_active?: boolean }>(BASE);

export const fetchProcesses = crud.fetchAll;

export const createProcess = crud.create;

export const updateProcess = crud.update;

export const deleteProcess = crud.remove;
