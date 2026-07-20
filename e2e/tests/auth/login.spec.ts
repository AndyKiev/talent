import { expect, test } from "@playwright/test";

// The ONE spec that exercises the login form through the UI (all other specs
// authenticate programmatically via the setup project). Runs logged OUT -
// with the default storageState the guard would bounce us off /auth/login.
test.use({ storageState: { cookies: [], origins: [] } });

test("login happy path", async ({ page }) => {
  await page.goto("/auth/login");
  await page.locator('input[autocomplete="username"]').fill("UKR7101004");
  await page.locator('input[autocomplete="current-password"]').fill("e2e");
  await page.locator("button.MuiButton-contained").click();
  // Forwarded through "/" to the user's default menu. Generous gate: cold
  // Vite compiles routes on first hit.
  await page.waitForURL(
    (url) => url.pathname !== "/" && !url.pathname.startsWith("/auth"),
    { timeout: 30000 },
  );
  await expect(page.getByRole("banner")).toBeVisible();
});

test("unknown user is rejected", async ({ page }) => {
  await page.goto("/auth/login");
  await page.locator('input[autocomplete="username"]').fill("E2E_NO_USER");
  await page.locator('input[autocomplete="current-password"]').fill("e2e");
  await page.locator("button.MuiButton-contained").click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/auth\/login/);
});
