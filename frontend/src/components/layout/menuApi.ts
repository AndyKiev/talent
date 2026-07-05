// src/components/layout/menuApi.ts
//
// Dynamic main-navigation menus (menus table). GET /menus/my returns the flat
// list the current user may see (backend filters by groups; group-less
// 'regular' users get only visible_to_regular items). GET /menus returns every
// active item — used by the developer default-menu select.
import { axiosInstance } from '../../api/axiosInstance';
import { BASE_URL } from '../../utils/eNums';

const BASE = `${BASE_URL}/menus`;

export interface MenuItem {
    id: number;
    key: string;
    label_key: string;
    path: string;
    icon: string | null;
    parent_id: number | null;
    sort_order: number;
    is_active: boolean;
}

export const fetchMyMenus = async (): Promise<MenuItem[]> => {
    const res = await axiosInstance.get<MenuItem[]>(`${BASE}/my`);
    return res.data ?? [];
};

export const fetchAllMenus = async (): Promise<MenuItem[]> => {
    const res = await axiosInstance.get<MenuItem[]>(BASE);
    return res.data ?? [];
};
