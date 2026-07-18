// src/store/createViewStore.ts
//
// Factory for the per-user (per-browser) "grid or cards" list-view preference
// stores. Persisted to localStorage via zustand `persist`, which hydrates the
// store once on load; pages then read/write it purely from zustand, so the
// choice survives navigation and reloads. One factory — the per-page stores
// (recruitment / employees / people-review) are one-liners over it.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ListView = 'grid' | 'cards';

export interface ViewState {
    view: ListView;
    setView: (view: ListView) => void;
}

export function createViewStore(storageName: string) {
    return create<ViewState>()(
        persist(
            (set) => ({
                view: 'grid' as ListView,
                setView: (view: ListView) => set({ view }),
            }),
            {
                name: storageName,
                // v1 renamed the per-store fields (taskView/listView/rosterView)
                // to the uniform `view` — migrate so saved preferences survive.
                version: 1,
                migrate: (persisted: unknown) => {
                    const p = (persisted ?? {}) as Record<string, unknown>;
                    const legacy = p.view ?? p.taskView ?? p.listView ?? p.rosterView;
                    return { view: (legacy === 'cards' ? 'cards' : 'grid') as ListView };
                },
            },
        ),
    );
}
