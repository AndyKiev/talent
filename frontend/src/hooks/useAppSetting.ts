// hooks/useAppSetting.ts
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    fetchAppSettingByKey,
    fetchAppSettings,
    type SettingValue,
} from '../components/developer/settings/settingsApi';
import { appSettingByKeyQK, APP_SETTINGS_QK } from '../utils/queryKeys';

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

/**
 * Convenience wrapper for integer settings. Returns the numeric value, or
 * `fallback` while loading / when the setting is missing or non-numeric.
 */
export function useIntegerSetting(key: string, fallback: number): { value: number; isLoading: boolean } {
    const { value, isLoading } = useAppSetting(key);
    const num = typeof value === 'number' ? value : Number(value);
    return { value: Number.isFinite(num) ? num : fallback, isLoading };
}

/**
 * Effective boolean for a (possibly nested) "multi-story" setting: on only when
 * the setting itself AND every ancestor (parent_id chain) are `true`. Resolves
 * client-side from the full settings list (one shared query, not N by-key calls),
 * so toggling a parent in developer settings instantly re-gates every consumer.
 * A missing/not-yet-seeded key resolves to `false` (safe off); `false` while the
 * list is still loading. Use this to gate a child of a master switch.
 */
export function useEffectiveBooleanSetting(key: string): { enabled: boolean; isLoading: boolean } {
    const { data: settings, isLoading } = useQuery({
        queryKey: APP_SETTINGS_QK,
        queryFn: fetchAppSettings,
        staleTime: 5 * 60_000,
    });
    const enabled = useMemo(() => {
        if (!settings) return false;
        const byId = new Map(settings.map((s) => [s.id, s]));
        let cur = settings.find((s) => s.key === key);
        if (!cur) return false; // not seeded -> off (safe)
        const seen = new Set<number>();
        while (cur && !seen.has(cur.id)) {
            seen.add(cur.id);
            if (cur.value !== true) return false;
            cur = cur.parent_id != null ? byId.get(cur.parent_id) : undefined;
        }
        return true;
    }, [settings, key]);
    return { enabled, isLoading };
}
