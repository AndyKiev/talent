// hooks/useAppSetting.ts
import { useQuery } from '@tanstack/react-query';
import { fetchAppSettingByKey, type SettingValue } from '../components/developer/settings/settingsApi';
import { appSettingByKeyQK } from '../utils/queryKeys';

/**
 * Read one application setting by its key. Returns the typed value plus loading
 * state. A missing setting (404) resolves to `undefined` value (not an error),
 * so callers can fall back to a default. Used e.g. to gate the people-review
 * talent-status editing on `people_review_edit_talent_status`.
 */
export function useAppSetting(key: string) {
    const { data, isLoading, isError } = useQuery({
        queryKey: appSettingByKeyQK(key),
        queryFn: () => fetchAppSettingByKey(key),
        staleTime: 5 * 60_000,
        retry: false,
    });
    const value: SettingValue | undefined = data?.value ?? undefined;
    return { value, setting: data, isLoading, isError };
}

/** Convenience wrapper for boolean feature-flag settings. */
export function useBooleanSetting(key: string): { enabled: boolean; isLoading: boolean } {
    const { value, isLoading } = useAppSetting(key);
    return { enabled: value === true, isLoading };
}
