// src/store/reviewSessionsViewStore.ts
// "Grid or cards" preference for the people-review SESSIONS list (see
// createViewStore). Separate from peopleReviewViewStore, which remembers the
// per-session employee-roster view.
import { createViewStore } from './createViewStore';

export const useReviewSessionsViewStore = createViewStore('review_sessions_view');
