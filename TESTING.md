# Testing cheat sheet

Prerequisite for EVERYTHING here: the dev stack must be running.
Tests never start it; if it is down they fail fast with one clear message.

- **Windows**: `Ctrl+Alt+1` (/start1 — VSCode compound task).
- **Linux (Ubuntu)**: activate the venv, then the make targets (each in its own terminal):

  ```bash
  source backend/.venv/bin/activate
  make db-up          # Postgres container (:5433)
  make run-backend    # uvicorn :8004 (needs the venv active)
  make run-frontend   # vite :4004
  ```

Commands are shown for **Windows (PowerShell)** and **Linux (Ubuntu, bash)** where
they differ. Playwright/npm/pytest commands themselves are identical on both —
only venv paths, the browser-install extras, and file locations differ.

## Browser tests (Playwright)

One-time setup per machine (and after a Playwright version bump) — MUST be run
by a HUMAN in a normal terminal (see Troubleshooting):

```powershell
# Windows
cd e2e
npx playwright install chromium            # you must SEE download progress bars (~300 MB)
```

```bash
# Linux (Ubuntu): --with-deps also apt-installs required system libraries (asks sudo)
cd e2e
npx playwright install --with-deps chromium
# no sudo available? split it:
#   npx playwright install chromium && sudo npx playwright install-deps chromium
```

Running (identical on both OS):

```bash
cd e2e                           # ALWAYS from e2e/ - running from repo root breaks (version clash)
npx playwright test              # green "ok" / red "x" per test in terminal
npx playwright test --headed     # watch the browser do it (Linux: needs a display; on a headless server use: xvfb-run npx playwright test --headed)
npx playwright show-report       # html report: green/red list, click red -> trace, screenshots, steps
npx playwright test tests/admin/department_categories.spec.ts   # one module only
```

## API tests (pytest) — identical on both OS

```bash
cd backend
poetry run pytest tests -q       # green dots = pass, F = fail with full diff
```

## After any RED / crashed / interrupted run

Deletes leftover E2E_* records from the dev DB (a timed-out test can skip its
own cleanup — this always catches it). From repo root:

```powershell
# Windows
backend\.venv\Scripts\python.exe -m backend.tests.cleanup_e2e_data
```

```bash
# Linux
backend/.venv/bin/python -m backend.tests.cleanup_e2e_data
```

## Windows ⇄ Linux differences at a glance

| Thing | Windows | Linux (Ubuntu) |
|---|---|---|
| venv python | `backend\.venv\Scripts\python.exe` | `backend/.venv/bin/python` |
| venv activate | `backend\.venv\Scripts\Activate.ps1` | `source backend/.venv/bin/activate` |
| browser install | `npx playwright install chromium` | `npx playwright install --with-deps chromium` (system libs!) |
| browsers location | `%LOCALAPPDATA%\ms-playwright` | `~/.cache/ms-playwright` |
| `--headed` mode | just works | needs a display; headless server → `xvfb-run` |

## Troubleshooting

- **"Playwright Test did not expect test() to be called here"** — you ran from
  the repo root and npx grabbed a second Playwright version. `cd e2e` and rerun.
  Never accept npx's "Ok to install playwright@X?" prompt.
- **"Executable doesn't exist ... run npx playwright install"** — the browser
  binaries are missing (Windows: `%LOCALAPPDATA%\ms-playwright`, Linux:
  `~/.cache/ms-playwright`). Fix: `cd e2e` then `npx playwright install
  chromium` (Linux: add `--with-deps`) — run it YOURSELF in your own terminal
  and confirm you see download progress bars. An AI-agent session CANNOT fix
  this for you: agent shells sandbox writes outside the project folder, so an
  agent-run install lands in storage your OS never sees (the agent's tests go
  green while yours keep failing).
- **Linux: browser launches fail with missing shared libraries** (`error while
  loading shared libraries: libnss3.so` or similar) — system deps not
  installed: `sudo npx playwright install-deps chromium`.
- **Login/requests return 500 while the stack is up** — Postgres :5433 dropped
  its port publish or Docker (Desktop) is down: `docker restart talent-postgres-fresh`.

## More

- What is covered: `e2e/COVERAGE.md`
- How to extend coverage (for me or an AI session): `e2e/ROADMAP.md`
- Rules + AI decision flow: `/e2e` skill (`.claude/skills/e2e/SKILL.md`)
