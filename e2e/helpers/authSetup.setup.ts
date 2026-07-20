import fs from "node:fs";
import path from "node:path";
import { test as setup } from "@playwright/test";
import {
  ADMIN_STORAGE_STATE,
  ADMIN_USERNAME,
  API_URL,
  FRONTEND_URL,
} from "../playwright.config";

// Programmatic login: call the API (BYPASS_LDAP accepts any password for an
// existing employee code) and inject the tokens into localStorage in the
// exact shape zustand-persist writes under the "auth-storage" key. The root
// route guard only checks access_token, so this equals being logged in.
setup("authenticate as admin via API", async ({ request }) => {
  const response = await request.post(`${API_URL}/jwt/login`, {
    form: { username: ADMIN_USERNAME, password: "e2e" },
  });
  if (!response.ok()) {
    throw new Error(
      `Login failed: ${response.status()} ${await response.text()}`,
    );
  }
  const body = (await response.json()) as {
    access_token: string;
    refresh_token: string;
  };

  const authStorageValue = JSON.stringify({
    state: {
      access_token: body.access_token,
      refresh_token: body.refresh_token,
    },
    version: 0,
  });
  const storageState = {
    cookies: [],
    origins: [
      {
        origin: FRONTEND_URL,
        localStorage: [{ name: "auth-storage", value: authStorageValue }],
      },
    ],
  };

  const statePath = path.resolve(__dirname, "..", ADMIN_STORAGE_STATE);
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(storageState, null, 2));
});
