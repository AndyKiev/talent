// src/store/recruitmentViewStore.ts
//
// Per-user (per-browser) preference for how the recruitment tasks list is
// displayed — a DataGrid or a card grid. Persisted to localStorage via zustand
// `persist`, which hydrates the store once on load; the page then reads/writes
// it purely from zustand, so the choice survives navigation and reloads.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type RecruitmentTaskView = 'grid' | 'cards';

interface RecruitmentViewState {
    taskView: RecruitmentTaskView;
    setTaskView: (view: RecruitmentTaskView) => void;
}

export const useRecruitmentViewStore = create<RecruitmentViewState>()(
    persist(
        (set) => ({
            taskView: 'grid',
            setTaskView: (taskView) => set({ taskView }),
        }),
        { name: 'recruitment_view' },
    ),
);
