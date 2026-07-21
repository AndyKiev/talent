import { test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import path from "node:path";

// Bridges the black-box pytest API suite (backend/tests/) into the SAME
// "npx playwright test" entry point, reachable as its own group via
// "npx playwright test be" (see the "be" project in playwright.config.ts).
// This is a thin runner, not a duplicate: pass/fail and every real assertion
// come from pytest itself - its own dots/F output prints live above (stdio
// inherit) so a failure is diagnosable right here. The dev stack must
// already be running; backend/tests/conftest.py enforces that itself with
// its own fail-fast preflight, same as the frontend specs.
test("backend API suite (pytest)", () => {
  test.setTimeout(180000);
  const repoRoot = path.resolve(__dirname, "..", "..", "..");
  const pythonBin = path.join(
    repoRoot,
    "backend",
    ".venv",
    process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
  );
  try {
    execFileSync(pythonBin, ["-m", "pytest", "tests", "-q"], {
      cwd: path.join(repoRoot, "backend"),
      stdio: "inherit",
    });
  } catch {
    throw new Error(
      "pytest API suite failed - see the pytest output printed above for details",
    );
  }
});
