// src/components/admin/departments/departmentRegionLinkApi.ts
import { BASE_URL } from '../../../utils/eNums';
import type { Region } from '../regions/regionApi';
import type { MutationResponse } from '../../../types/mutationResponse';
export type { MutationResponse };
import { createCrudApi } from '../../../api/createCrudApi';

const BASE = `${BASE_URL}/department_region_links`;

export interface DepartmentRegionLink {
    id: number;
    department_id: number;
    region_id: number;
    is_active: boolean;
    created_at: string;
    region: Region | null;
}

export interface DepartmentRegionLinkCreate {
    department_id: number;
    region_id: number;
    is_active: boolean;
}

export interface DepartmentRegionLinkUpdate {
    region_id?: number;
    is_active?: boolean;
}

const crud = createCrudApi<DepartmentRegionLink, DepartmentRegionLinkCreate, DepartmentRegionLinkUpdate, { department_id?: number; region_id?: number; is_active?: boolean }>(BASE);

export const fetchDepartmentRegionLinks = crud.fetchAll;

export const createDepartmentRegionLink = crud.create;

export const updateDepartmentRegionLink = crud.update;

export const deleteDepartmentRegionLink = crud.remove;
