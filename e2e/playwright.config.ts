import { defineConfig, devices } from "@playwright/test";

// Browser E2E suite. The dev stack must ALREADY be running (/start1):
// backend on :8004, frontend on :4004. This config never starts servers
// (no webServer block on purpose) - global_setup fails fast instead.
export const FRONTEND_URL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:4004";
export const API_URL = (
  process.env.E2E_API_BASE_URL ?? "http://127.0.0.1:8004/api/v1"
).replace(/\/$/, "");
export const ADMIN_STORAGE_STATE = ".auth/admin.json";
export const ADMIN_USERNAME = "UKR7101004";

export default defineConfig({
  testDir: "./tests",
  globalSetup: "./global_setup",
  // Shared dev DB: serialize everything to avoid cross-test races.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  // Dev-server target: cold Vite route compiles, --reload backend, and
  // 20-35s mutation refetches on slow list endpoints. 120s per test is the
  // realistic budget today (jobs spec sets 240s itself); green tests never
  // pay for the slack.
  timeout: 120000,
  expect: { timeout: 10000 },
  use: {
    baseURL: FRONTEND_URL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "setup",
      testDir: "./helpers",
      testMatch: /authSetup\.setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: ADMIN_STORAGE_STATE,
      },
      dependencies: ["setup"],
    },
  ],
});
