import { expect, request, test } from "@playwright/test";
import { ADMIN_USERNAME, API_URL } from "../../../playwright.config";
import { waitForGridLoaded } from "../../../helpers/dataGrid";

// Regression guard for the silent-refresh hang.
//
// The access token lives 15 minutes; the full suite runs longer, so a random
// test used to meet an EXPIRED token, and the page then hung on its spinner
// forever - the 401 burst triggered POST /jwt/refresh, and persisting the
// rotated pair via authStore.setTokens() ran queryClient.clear(), which
// removed the page's query WHILE its fetch was in flight. The orphaned
// observer stayed pending with nothing to refetch it.
//
// This spec forces that exact condition: a garbage access token next to a
// REAL refresh token, then a cold load of a grid page. It must recover
// silently and render the grid. It is a race, so a regression may need a
// couple of runs to show - it reproduced ~1 load in 4.
test.use({ storageState: { cookies: [], origins: [] } });

test("expired access token recovers silently and the page still renders", async ({
  page,
}) => {
  // A real refresh token (only the ACCESS token is made invalid).
  const api = await request.newContext();
  const login = await api.post(`${API_URL}/jwt/login`, {
    form: { username: ADMIN_USERNAME, password: "e2e" },
  });
  expect(login.status()).toBe(200);
  const refreshToken = ((await login.json()) as { refresh_token: string })
    .refresh_token;
  await api.dispose();

  // Land on the origin first so localStorage is writable, then seed the
  // broken auth state in the exact shape zustand-persist uses.
  await page.goto("/auth/login");
  await page.evaluate((refresh_token) => {
    localStorage.setItem(
      "auth-storage",
      JSON.stringify({
        state: { access_token: "expired.access.token", refresh_token },
        version: 0,
      }),
    );
  }, refreshToken);

  await page.goto("/admin/user_groups_group/user_group_types");
  await waitForGridLoaded(page);
  await expect(page.locator('[role="row"]').first()).toBeVisible();

  // The rotated refresh token must be persisted, or the NEXT refresh (15 min
  // later) logs the user out instead of hanging.
  const stored = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("auth-storage") ?? "{}") as {
        state?: { access_token?: string; refresh_token?: string };
      },
  );
  expect(stored.state?.access_token).not.toBe("expired.access.token");
  expect(stored.state?.refresh_token).toBeTruthy();
  expect(stored.state?.refresh_token).not.toBe(refreshToken);
});
