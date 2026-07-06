import { useQuery } from '@tanstack/react-query';
import { fetchSessionFrozenSettings } from './peopleReviewApi';
import { useBooleanSetting } from '../../hooks/useAppSetting';

/**
 * Boolean app setting as FROZEN into a review session at open time
 * (review_session_settings snapshot). The frozen value wins, so a
 * developer-settings change never re-gates an already-opened session.
 * Falls back to the LIVE setting only when the session has no frozen row
 * for the key (sessions opened before the freeze existed).
 */
export function useFrozenBooleanSetting(
    sessionId: number,
    key: string,
): { enabled: boolean; isLoading: boolean } {
    const { data, isLoading: frozenLoading } = useQuery({
        queryKey: ['review_session_frozen_settings', sessionId],
        queryFn: () => fetchSessionFrozenSettings(sessionId),
        enabled: Number.isFinite(sessionId) && sessionId > 0,
        // Written once at session open — effectively immutable.
        staleTime: 10 * 60_000,
    });
    const { enabled: liveEnabled, isLoading: liveLoading } = useBooleanSetting(key);
    const hasFrozen = !!data && key in data;
    const enabled = hasFrozen ? data[key] === true : liveEnabled;
    return { enabled, isLoading: frozenLoading || (!hasFrozen && liveLoading) };
}
