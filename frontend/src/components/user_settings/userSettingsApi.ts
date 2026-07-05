// src/components/user_settings/userSettingsApi.ts
import { axiosInstance } from '../../api/axiosInstance';
import { BASE_URL } from '../../utils/eNums';
import type { SettingValue } from '../developer/settings/settingsApi';

const USER_SETTINGS_BASE = `${BASE_URL}/user_settings`;

// One row for the user-facing settings page: the global default, this user's
// override (if any), the resolved effective value, and (for integers) the
// allowed range — min always 1, max = the global cap.
export interface EffectiveUserSetting {
    key: string;
    label_key: string | null;
    description_key: string | null;
    value_type_key: string | null;
    // Option-set name for select-driven settings (e.g. 'menus' for default_menu).
    options_source: string | null;
    global_value: SettingValue;
    user_value: SettingValue;
    effective_value: SettingValue;
    has_override: boolean;
    min_value: number | null;
    max_value: number | null;
}

export interface MutationResponse<T> {
    detail: string;
    data: T;
}

export const fetchEffectiveUserSettings = async (): Promise<EffectiveUserSetting[]> => {
    const res = await axiosInstance.get<EffectiveUserSetting[]>(`${USER_SETTINGS_BASE}/effective`);
    return res.data ?? [];
};

export const setUserSetting = async ({
    key,
    value,
}: {
    key: string;
    value: SettingValue;
}): Promise<MutationResponse<unknown>> => {
    const res = await axiosInstance.put<MutationResponse<unknown>>(`${USER_SETTINGS_BASE}/${key}`, { value });
    return res.data;
};

export const resetUserSetting = async (key: string): Promise<void> => {
    await axiosInstance.delete(`${USER_SETTINGS_BASE}/${key}`);
};
