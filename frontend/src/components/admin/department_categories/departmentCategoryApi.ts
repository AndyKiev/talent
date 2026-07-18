// src/components/admin/department_categories/departmentCategoryApi.ts
import { BASE_URL } from '../../../utils/eNums.ts';
import type { MutationResponse } from '../../../types/mutationResponse';
export type { MutationResponse };
import { createCrudApi } from '../../../api/createCrudApi';

const BASE = `${BASE_URL}/admin/department_categories`;

export interface DepartmentCategory {
    id: number;
    name: string;
    key: string | null;
    description: string | null;
    is_active: boolean;
    is_main: boolean;
    is_responsibility: boolean;
    sort_order: number;
    created_at: string;
}

export interface DepartmentCategoryCreate {
    name: string;
    key?: string | null;
    description?: string | null;
    is_active: boolean;
    is_main: boolean;
    is_responsibility: boolean;
}

export interface DepartmentCategoryUpdate {
    name?: string;
    key?: string | null;
    description?: string | null;
    is_active?: boolean;
    is_main?: boolean;
    is_responsibility?: boolean;
    sort_order?: number;
}

const crud = createCrudApi<DepartmentCategory, DepartmentCategoryCreate, DepartmentCategoryUpdate, { is_main?: boolean; is_active?: boolean }>(BASE);

export const fetchDepartmentCategories = crud.fetchAll;

export const createDepartmentCategory = crud.create;

export const updateDepartmentCategory = crud.update;

export const deleteDepartmentCategory = crud.remove;
