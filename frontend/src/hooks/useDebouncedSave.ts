import { useCallback, useEffect, useRef } from 'react';

/**
 * Debounced, serialized autosave for "persist on every change" screens.
 *
 * Call `schedule()` from your edit handlers (NOT from a `useEffect` that watches
 * state) to (re)arm the debounce; `save` runs once the user has been idle for
 * `delayMs`. Two guarantees the naive `setTimeout(() => mutate())` pattern lacks:
 *
 *  - **Serialized**: only ONE `save` runs at a time. If edits arrive while a save
 *    is in flight, exactly one trailing save runs after it settles (intermediate
 *    edits coalesce). This is what prevents overlapping requests hammering the
 *    same row — the cause of the lock-contention freeze.
 *  - **Self-destroying**: the pending timer is cleared on unmount, so a queued
 *    save never fires against a torn-down component.
 *
 * `save` is read through a ref, so you may pass a fresh inline closure over the
 * latest state each render without re-arming anything. `save` should resolve when
 * the round-trip finishes and surface its own errors (e.g. a mutation's onError) —
 * on rejection the edit stays dirty and is retried on the next `schedule()`/`flush()`,
 * never in a busy-loop.
 *
 * `flush()` persists immediately (e.g. on close / before a gated action) and
 * resolves once everything pending has settled; it is a no-op when nothing is dirty.
 *
 * `cancel()` drops any pending (timer-armed or dirty) save without running it — use
 * it when the record is being deleted/reset so a queued save can't resurrect it.
 */
export function useDebouncedSave(save: () => Promise<void>, delayMs: number) {
    const saveRef = useRef(save);
    saveRef.current = save;

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inFlightRef = useRef<Promise<void> | null>(null);
    // True when an edit needs persisting; claimed (set false) when a save starts,
    // re-set if the save fails or a new edit lands mid-flight.
    const dirtyRef = useRef(false);

    const clearTimer = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };

    const run = useCallback(async (): Promise<void> => {
        clearTimer();
        if (!dirtyRef.current) return; // nothing to save
        if (inFlightRef.current) return; // a save owns the turn; it re-checks dirty when done
        dirtyRef.current = false; // claim the current edits
        let ok = false;
        const work = (async () => {
            try {
                await saveRef.current();
                ok = true;
            } catch {
                // The save reports its own error — keep the edit dirty so the next
                // schedule()/flush() retries it (no immediate re-run: see below).
                dirtyRef.current = true;
            } finally {
                inFlightRef.current = null;
            }
        })();
        inFlightRef.current = work;
        await work;
        // Chain a single trailing save only on success — an edit landed during the
        // round-trip. On failure we wait for the next edit/flush so a persistent
        // error can't busy-loop. Skip if a fresh debounce timer is already armed.
        if (ok && dirtyRef.current && !timerRef.current) void run();
    }, []);

    const schedule = useCallback(() => {
        dirtyRef.current = true;
        clearTimer();
        timerRef.current = setTimeout(() => { void run(); }, delayMs);
    }, [delayMs, run]);

    const flush = useCallback(async () => {
        clearTimer();
        if (inFlightRef.current) await inFlightRef.current;
        await run();
        if (inFlightRef.current) await inFlightRef.current;
    }, [run]);

    const cancel = useCallback(() => {
        clearTimer();
        dirtyRef.current = false;
    }, []);

    // Destroy the pending timer on unmount so a queued save never fires late.
    useEffect(() => () => clearTimer(), []);

    return { schedule, flush, cancel };
}
