// src/components/admin/regions/regionApi.ts
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums.ts';

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

export interface MutationResponse<T> {
    detail: string;
    data: T;
}

export const fetchRegions = async (
    params?: { is_active?: boolean },
): Promise<Region[]> => {
    const res = await axiosInstance.get<Region[]>(BASE, { params });
    return res.data ?? [];
};

export const createRegion = async (
    body: RegionCreate,
): Promise<MutationResponse<Region>> => {
    const res = await axiosInstance.post<MutationResponse<Region>>(BASE, body);
    return res.data;
};

export const updateRegion = async ({
    id,
    data,
}: {
    id: number;
    data: RegionUpdate;
}): Promise<MutationResponse<Region>> => {
    const res = await axiosInstance.patch<MutationResponse<Region>>(`${BASE}/${id}`, data);
    return res.data;
};

export const deleteRegion = async (id: number): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${BASE}/${id}`);
    return res.data;
};

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
