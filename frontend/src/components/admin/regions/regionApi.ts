// src/components/admin/regions/regionApi.ts
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums.ts';
import type { MutationResponse } from '../../../types/mutationResponse';
export type { MutationResponse };
import { createCrudApi } from '../../../api/createCrudApi';

const BASE = `${BASE_URL}/regions`;

export interface Region {
    id: number;
    name: string;
    key: string;
    is_active: boolean;
    sort_order: number;
    created_at: string;
}

export interface RegionCreate {
    name: string;
    key: string;
    is_active: boolean;
}

export interface RegionUpdate {
    name?: string;
    key?: string;
    is_active?: boolean;
}

const crud = createCrudApi<Region, RegionCreate, RegionUpdate, { is_active?: boolean }>(BASE);

export const fetchRegions = crud.fetchAll;

export const createRegion = crud.create;

export const updateRegion = crud.update;

export const deleteRegion = crud.remove;

export type MoveDirection = 'up' | 'down' | 'top' | 'bottom';

export const moveRegion = async ({
    id,
    direction,
}: {
    id: number;
    direction: MoveDirection;
}): Promise<MutationResponse<Region>> => {
    const res = await axiosInstance.post<MutationResponse<Region>>(
        `${BASE}/${id}/move`,
        { direction },
    );
    return res.data;
};
