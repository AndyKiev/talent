import { test as base } from "@playwright/test";
import { apiUrl, newApiContext } from "./apiClient";

// Shared-dev-DB discipline: every record a UI test creates is registered with
// track(); the fixture teardown deletes tracked records via the API even when
// the UI part of the test failed mid-way. After a hard crash (process killed)
// run the janitor instead: python -m backend.tests.cleanup_e2e_data

export interface TrackedRecord {
  /** API collection path, e.g. "/admin/department_categories". */
  path: string;
  id: number;
}

export interface CleanupTracker {
  track: (record: TrackedRecord) => void;
  untrack: (id: number) => void;
}

export const test = base.extend<{ cleanup: CleanupTracker }>({
  cleanup: async ({}, use) => {
    const tracked: TrackedRecord[] = [];
    await use({
      track: (record) => {
        tracked.push(record);
      },
      untrack: (id) => {
        const index = tracked.findIndex((record) => record.id === id);
        if (index >= 0) tracked.splice(index, 1);
      },
    });
    if (tracked.length > 0) {
      const api = await newApiContext();
      for (const record of tracked) {
        try {
          await api.delete(apiUrl(`${record.path}/${record.id}`));
        } catch {
          // Best effort - the janitor script catches anything left behind.
        }
      }
      await api.dispose();
    }
  },
});

export { expect } from "@playwright/test";
