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
    // Self-FK: a child setting nests under a parent boolean (multi-story). null = top level.
    parent_id: number | null;
    label_key: string | null;
    description_key: string | null;
    is_active: boolean;
    // When true, an employee may override this setting for themselves.
    user_overridable: boolean;
    // When set, the value is a list edited via a multi-select bound to this
    // option set ("job_categories" | "employee_statuses"). value_type_key = json.
    options_source: string | null;
    // When false, the setting can never be made user-overridable (toggle hidden).
    user_override_allowed: boolean;
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
    user_overridable?: boolean;
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

// Same shape as fetchAppSettings, but each value is resolved for the current
// user (their override if overridable & set & clamped, else the global value).
// This is what the consumer hooks read so per-user settings take effect.
export const fetchEffectiveSettingsForMe = async (): Promise<AppSetting[]> => {
    const res = await axiosInstance.get<AppSetting[]>(`${SETTINGS_BASE}/effective_for_me`);
    return res.data ?? [];
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
