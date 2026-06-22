// src/components/developer/settings/settingsApi.ts
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums';

const SETTINGS_BASE = `${BASE_URL}/app_settings`;
const VALUE_TYPES_BASE = `${BASE_URL}/setting_value_types`;

// A setting value can be a boolean, number, date string, or a config object —
// the value_type_key says how to read/edit it.
export type SettingValue = boolean | number | string | Record<string, unknown> | unknown[] | null;

export interface SettingValueType {
    id: number;
    key: string;
    name: string;
    is_active: boolean;
}

export interface AppSetting {
    id: number;
    key: string;
    value: SettingValue;
    value_type_id: number;
    value_type_key: string | null;
    label_key: string | null;
    description_key: string | null;
    is_active: boolean;
}

export interface AppSettingCreate {
    key: string;
    value: SettingValue;
    value_type_id: number;
    label_key?: string | null;
    description_key?: string | null;
    is_active: boolean;
}

export interface AppSettingUpdate {
    value?: SettingValue;
    value_type_id?: number;
    label_key?: string | null;
    description_key?: string | null;
    is_active?: boolean;
}

export interface MutationResponse<T> {
    detail: string;
    data: T;
}

export const fetchAppSettings = async (): Promise<AppSetting[]> => {
    const res = await axiosInstance.get<AppSetting[]>(SETTINGS_BASE);
    return res.data ?? [];
};

export const fetchAppSettingByKey = async (key: string): Promise<AppSetting> => {
    const res = await axiosInstance.get<AppSetting>(`${SETTINGS_BASE}/by_key/${key}`);
    return res.data;
};

export const createAppSetting = async (
    body: AppSettingCreate,
): Promise<MutationResponse<AppSetting>> => {
    const res = await axiosInstance.post<MutationResponse<AppSetting>>(SETTINGS_BASE, body);
    return res.data;
};

export const updateAppSetting = async ({
    id,
    data,
}: {
    id: number;
    data: AppSettingUpdate;
}): Promise<MutationResponse<AppSetting>> => {
    const res = await axiosInstance.patch<MutationResponse<AppSetting>>(`${SETTINGS_BASE}/${id}`, data);
    return res.data;
};

export const deleteAppSetting = async (id: number): Promise<void> => {
    await axiosInstance.delete(`${SETTINGS_BASE}/${id}`);
};

export const fetchSettingValueTypes = async (): Promise<SettingValueType[]> => {
    const res = await axiosInstance.get<SettingValueType[]>(VALUE_TYPES_BASE);
    return res.data ?? [];
};
