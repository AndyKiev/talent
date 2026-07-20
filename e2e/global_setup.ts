import { API_URL, FRONTEND_URL } from "./playwright.config";

const STACK_DOWN =
  "Dev stack is not running. Start it first with /start1 " +
  "(backend :8004, frontend :4004), then re-run.";

async function ping(url: string, label: string): Promise<void> {
  try {
    await fetch(url);
  } catch {
    throw new Error(`${STACK_DOWN} (${label} unreachable at ${url})`);
  }
}

export default async function globalSetup(): Promise<void> {
  // register_config is public (no auth) - cheap backend liveness probe.
  await ping(`${API_URL}/jwt/register_config`, "backend");
  await ping(FRONTEND_URL, "frontend");
}
