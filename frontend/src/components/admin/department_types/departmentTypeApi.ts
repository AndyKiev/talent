// src/components/admin/department_types/departmentTypeApi.ts
import { BASE_URL } from '../../../utils/eNums.ts';
import type { MutationResponse } from '../../../types/mutationResponse';
export type { MutationResponse };
import { createCrudApi } from '../../../api/createCrudApi';

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

const crud = createCrudApi<DepartmentType, DepartmentTypeCreate, DepartmentTypeUpdate>(BASE);

export const fetchDepartmentTypes = crud.fetchList;

export const createDepartmentType = crud.create;

export const updateDepartmentType = crud.update;

export const deleteDepartmentType = crud.remove;
