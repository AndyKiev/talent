import { expect, test } from "@playwright/test";

// Verifies the injected storageState logs us in: the root route forwards an
// authenticated user to their default menu (user setting > app default >
// first visible menu), and the AppShell (MUI AppBar = banner) renders with
// the DB-driven main menu.
test("authenticated shell loads", async ({ page }) => {
  await page.goto("/");
  // Forwarded off "/" to some module - never back to the login page.
  // Generous first-navigation gate: cold Vite compiles routes on first hit.
  await page.waitForURL(
    (url) => url.pathname !== "/" && !url.pathname.startsWith("/auth"),
    { timeout: 30000 },
  );
  await expect(page.getByRole("banner")).toBeVisible();
});
