// src/store/missionsViewStore.ts
//
// Grid-or-cards preference for the employee missions list, persisted per user.
// One-liner over the shared factory, same as the other list stores.
import { createViewStore } from './createViewStore';

export const useMissionsViewStore = createViewStore('missions_view');
