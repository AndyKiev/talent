// src/components/developer/security/menus/menuAdminApi.ts
import { axiosInstance } from '../../../../api/axiosInstance';
import { BASE_URL } from '../../../../utils/eNums';

const BASE = `${BASE_URL}/menus`;

/** Visibility mode used by the form (derived from the three model flags). */
export type MenuVisibilityMode = 'all_employees' | 'all_groups' | 'specific';

export interface MenuAdmin {
    id: number;
    key: string;
    label_key: string;
    path: string;
    icon: string | null;
    parent_id: number | null;
    sort_order: number;
    is_active: boolean;
    visible_to_all_groups: boolean;
    visible_to_regular: boolean;
    group_ids: number[];
}

export interface MenuCreate {
    key: string;
    label_key: string;
    path: string;
    icon?: string | null;
    parent_id?: number | null;
    sort_order: number;
    is_active: boolean;
    visible_to_all_groups: boolean;
    visible_to_regular: boolean;
    group_ids: number[];
}

export type MenuUpdate = Partial<MenuCreate>;

export interface MutationResponse<T> {
    detail: string;
    data: T;
}

export const fetchMenusManage = async (): Promise<MenuAdmin[]> => {
    const res = await axiosInstance.get<MenuAdmin[]>(`${BASE}/manage`);
    return res.data ?? [];
};

export const createMenu = async (
    body: MenuCreate,
): Promise<MutationResponse<MenuAdmin>> => {
    const res = await axiosInstance.post<MutationResponse<MenuAdmin>>(BASE, body);
    return res.data;
};

export const updateMenu = async ({
    id,
    data,
}: {
    id: number;
    data: MenuUpdate;
}): Promise<MutationResponse<MenuAdmin>> => {
    const res = await axiosInstance.patch<MutationResponse<MenuAdmin>>(`${BASE}/${id}`, data);
    return res.data;
};

// DELETE /menus/{id} → 200 with a translated detail (no typed body needed here)
export const deleteMenu = async (id: number): Promise<void> => {
    await axiosInstance.delete(`${BASE}/${id}`);
};
