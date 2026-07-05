// hooks/useDefaultMenu.ts
//
// Resolves where the current user should land: the `default_menu` setting
// (per-user override > app default), constrained to the menus the user can
// actually see. A stale user override (its menu no longer visible to the
// user) is auto-reset on the backend and ignored. Fallbacks, in order:
// effective setting -> app-level value -> first visible menu -> /settings.
import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMyMenus } from '../components/layout/menuApi';
import {
    MENUS_MY_QK,
    USER_SETTINGS_EFFECTIVE_QK,
    EFFECTIVE_SETTINGS_QK,
} from '../utils/queryKeys';
import {
    fetchEffectiveUserSettings,
    resetUserSetting,
} from '../components/user_settings/userSettingsApi';
import { useAuthStore } from '../store/authStore';

const DEFAULT_MENU_KEY = 'default_menu';

export function useDefaultMenu(): { path: string | null; ready: boolean } {
    const user = useAuthStore((s) => s.user);
    const qc = useQueryClient();
    const resetFired = useRef(false);

    const { data: menus, isSuccess: menusReady } = useQuery({
        queryKey: MENUS_MY_QK,
        queryFn: fetchMyMenus,
        enabled: !!user,
        staleTime: 5 * 60_000,
    });

    // The user-settings effective row carries global + override + effective
    // values in one shot — needed to detect (and reset) a stale override.
    const { data: userSettings, isSuccess: settingsReady } = useQuery({
        queryKey: USER_SETTINGS_EFFECTIVE_QK,
        queryFn: fetchEffectiveUserSettings,
        enabled: !!user,
        staleTime: 60_000,
    });

    const setting = userSettings?.find((s) => s.key === DEFAULT_MENU_KEY);
    const visibleIds = new Set((menus ?? []).map((m) => m.id));

    const overrideId =
        setting?.has_override && typeof setting.user_value === 'number'
            ? setting.user_value
            : null;
    const overrideStale = overrideId !== null && !visibleIds.has(overrideId);

    // Auto-reset a stale override (menu disappeared from the user's access).
    useEffect(() => {
        if (overrideStale && !resetFired.current) {
            resetFired.current = true;
            resetUserSetting(DEFAULT_MENU_KEY)
                .then(() => {
                    qc.invalidateQueries({ queryKey: USER_SETTINGS_EFFECTIVE_QK });
                    qc.invalidateQueries({ queryKey: EFFECTIVE_SETTINGS_QK });
                })
                .catch(() => {
                    /* non-fatal: the stale value is ignored locally anyway */
                });
        }
    }, [overrideStale, qc]);

    if (!user || !menusReady || !settingsReady) {
        return { path: null, ready: false };
    }

    const globalId =
        typeof setting?.global_value === 'number' ? setting.global_value : null;

    const candidates = [
        overrideStale ? null : overrideId,
        globalId,
    ].filter((id): id is number => id !== null);

    for (const id of candidates) {
        const menu = (menus ?? []).find((m) => m.id === id);
        if (menu) return { path: menu.path, ready: true };
    }
    // No usable setting — first visible top-level menu, else personal settings
    // (always accessible).
    const first = (menus ?? []).find((m) => m.parent_id === null);
    return { path: first?.path ?? '/settings', ready: true };
}
