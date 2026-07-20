import { request, type APIRequestContext } from "@playwright/test";
import { ADMIN_USERNAME, API_URL } from "../playwright.config";

/** Full backend URL for an API path ("/admin/department_categories"). */
export function apiUrl(apiPath: string): string {
  return `${API_URL}${apiPath}`;
}

/** Authenticated request context with a FRESH admin token.
 *
 *  Always logs in anew (cheap with BYPASS_LDAP) instead of reusing the setup
 *  project's token: access tokens expire after 15 minutes and the full suite
 *  runs longer - a reused token starts answering 401 late in the run. The
 *  browser side survives via the app's silent refresh; API contexts must
 *  refresh themselves. Dispose the context when done. */
export async function newApiContext(): Promise<APIRequestContext> {
  const login = await request.newContext();
  const response = await login.post(`${API_URL}/jwt/login`, {
    form: { username: ADMIN_USERNAME, password: "e2e" },
  });
  if (!response.ok()) {
    throw new Error(
      `API login failed: ${response.status()} ${await response.text()}`,
    );
  }
  const token = ((await response.json()) as { access_token: string })
    .access_token;
  await login.dispose();
  return request.newContext({
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });
}
