// src/store/permissionMatrixStore.ts
//
// Holds the permission-matrix draft (per-group set of OESL ids) so the BA's
// in-progress ticks survive navigating to other pages and back. In-memory
// (module-scoped) — it persists across route changes within the SPA session;
// a full page reload starts fresh, which is the desired "don't lose work while
// clicking around" behaviour without leaking stale state across logins.
import { create } from 'zustand';

export type MatrixDraft = Record<number, Set<number>>;

function cloneDraft(src: MatrixDraft): MatrixDraft {
  const out: MatrixDraft = {};
  for (const k of Object.keys(src)) out[Number(k)] = new Set(src[Number(k)]);
  return out;
}

interface PermissionMatrixState {
  draft: MatrixDraft;
  initialized: boolean;
  /** Seed from server state — only once, so edits aren't clobbered on remount. */
  hydrate: (server: MatrixDraft) => void;
  /** Force re-seed from server state (Reset button). */
  reset: (server: MatrixDraft) => void;
  /** Toggle a single cell. */
  toggle: (groupId: number, oeslId: number) => void;
  /** Replace one group's full set (check/uncheck-all for a column). */
  setGroup: (groupId: number, oeslIds: number[]) => void;
}

export const usePermissionMatrixStore = create<PermissionMatrixState>((set) => ({
  draft: {},
  initialized: false,

  hydrate: (server) =>
    set((s) => (s.initialized ? s : { draft: cloneDraft(server), initialized: true })),

  reset: (server) => set({ draft: cloneDraft(server), initialized: true }),

  toggle: (groupId, oeslId) =>
    set((s) => {
      const next = cloneDraft(s.draft);
      const grp = next[groupId] ?? new Set<number>();
      if (grp.has(oeslId)) grp.delete(oeslId);
      else grp.add(oeslId);
      next[groupId] = grp;
      return { draft: next };
    }),

  setGroup: (groupId, oeslIds) =>
    set((s) => {
      const next = cloneDraft(s.draft);
      next[groupId] = new Set(oeslIds);
      return { draft: next };
    }),
}));
