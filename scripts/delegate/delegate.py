"""Delegate an implementation task to DeepSeek and iterate locally.

Stdlib only. The remote model NEVER executes anything — it returns text, this
script writes the files and runs the validation. That is deliberate: the earlier
`.deepseek` sub-agent attempt failed because the remote side had no shell and
read-only git tools, so nothing ever ran.

The whole point is that Claude is NOT in the loop. Claude writes the brief once,
you run this, and Claude reviews the final diff.

Usage
-----
    python scripts/delegate/delegate.py brief.md            # dry run, writes nothing
    python scripts/delegate/delegate.py brief.md --apply    # writes files, runs validation

Brief format: markdown, with a ```json fence as the FIRST fenced block:

    ```json
    {
      "model": "deepseek-chat",
      "max_iterations": 4,
      "allow_paths": ["backend/api_v1/thing/"],
      "validate": ["cd backend && poetry run python -m py_compile api_v1/thing/thing_model.py"]
    }
    ```

    # Objective
    ...prose...

    # Context
    ...vault pages, existing file contents, the conventions that matter...

Everything after the config fence is sent verbatim as the task. Validation
commands come from the brief (yours), never from the model.
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
RUNS_DIR = REPO_ROOT / ".deepseek" / "runs"
API_URL = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com") + "/chat/completions"
DEFAULT_MODEL = "deepseek-chat"
DEFAULT_ITERATIONS = 4

# Paths the model may never write to, whatever the brief says.
FORBIDDEN = (".env", ".git/", ".claude/", "scripts/delegate/", ".deepseek/")

FILE_BLOCK_RE = re.compile(
    r"^```file:(?P<path>[^\n`]+)\n(?P<body>.*?)^```", re.MULTILINE | re.DOTALL
)
JSON_FENCE_RE = re.compile(r"```json\s*\n(?P<cfg>.*?)\n```", re.DOTALL)

SYSTEM_PROMPT = """You are an implementation engineer working inside an existing codebase.

Follow the conventions stated in the task EXACTLY — they are not suggestions, and
the reviewer will reject work that ignores them.

Output protocol, mandatory:
- Return the COMPLETE new content of every file you change, never a diff or a snippet.
- Wrap each file in a fence labelled with its repo-relative path:

```file:backend/api_v1/thing/thing_model.py
<entire file content>
```

- Touch only the paths the task allows. Do not invent new files outside them.
- After the file blocks, add a short "## Notes" section: what you changed and any
  assumption you had to make.
- If the task is underspecified, still produce your best complete implementation and
  state the assumption in Notes. Do not ask questions — nobody is reading them.
"""


# --------------------------------------------------------------------------- env


def read_env_value(key):
    if os.environ.get(key):
        return os.environ[key]
    env_file = REPO_ROOT / ".env"
    if not env_file.exists():
        return None
    found = None
    for raw in env_file.read_text(encoding="utf-8", errors="replace").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        if k.strip() == key:
            found = v.strip().strip('"').strip("'")  # last one wins, like dotenv
    return found


# --------------------------------------------------------------------------- brief


def parse_brief(path):
    text = Path(path).read_text(encoding="utf-8")
    match = JSON_FENCE_RE.search(text)
    if not match:
        sys.exit("[ERR] brief has no ```json config fence — see the module docstring")
    try:
        config = json.loads(match.group("cfg"))
    except json.JSONDecodeError as exc:
        sys.exit("[ERR] config fence is not valid JSON: %s" % exc)
    body = (text[: match.start()] + text[match.end():]).strip()
    if not body:
        sys.exit("[ERR] brief has a config but no task text")
    return config, body


def _normalize(rel):
    """Repo-relative posix path, with a leading './' removed but dots preserved."""
    p = rel.replace("\\", "/").strip()
    while p.startswith("./"):
        p = p[2:]
    return p


def path_allowed(rel, allow_paths):
    rel_posix = _normalize(rel)
    # Containment is checked on the resolved path, not by string inspection:
    # `..` segments and absolute paths must both fail here.
    try:
        resolved = (REPO_ROOT / rel_posix).resolve()
        resolved.relative_to(REPO_ROOT.resolve())
    except (ValueError, OSError):
        return False, "escapes the repo"
    if rel_posix.startswith("/") or ".." in rel_posix.split("/"):
        return False, "escapes the repo"
    for bad in FORBIDDEN:
        if rel_posix == bad.rstrip("/") or rel_posix.startswith(bad):
            return False, "forbidden path"
    if not allow_paths:
        return False, "no allow_paths in the brief"
    for allowed in allow_paths:
        a = _normalize(allowed)
        if rel_posix == a or rel_posix.startswith(a.rstrip("/") + "/"):
            return True, ""
    return False, "outside allow_paths"


# --------------------------------------------------------------------------- api


def call_deepseek(api_key, model, messages):
    payload = json.dumps(
        {"model": model, "messages": messages, "stream": False}
    ).encode("utf-8")
    request = urllib.request.Request(
        API_URL,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": "Bearer %s" % api_key,
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=600) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", "replace")[:500]
        sys.exit("[ERR] DeepSeek HTTP %s: %s" % (exc.code, body))
    except urllib.error.URLError as exc:
        sys.exit("[ERR] cannot reach DeepSeek: %s" % exc.reason)
    try:
        usage = data.get("usage", {})
        return data["choices"][0]["message"]["content"], usage
    except (KeyError, IndexError):
        sys.exit("[ERR] unexpected response shape: %s" % json.dumps(data)[:400])


# --------------------------------------------------------------------------- apply


def apply_files(reply, allow_paths, run_dir, apply):
    written, skipped = [], []
    for match in FILE_BLOCK_RE.finditer(reply):
        rel = match.group("path").strip()
        body = match.group("body")
        ok, why = path_allowed(rel, allow_paths)
        if not ok:
            skipped.append((rel, why))
            continue
        target = REPO_ROOT / rel
        if apply:
            if target.exists():
                backup = run_dir / "backup" / rel
                backup.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(target, backup)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(body, encoding="utf-8")
        written.append(rel)
    return written, skipped


def run_validation(commands):
    failures = []
    for command in commands:
        print("  $ %s" % command)
        proc = subprocess.run(
            command, shell=True, cwd=REPO_ROOT, capture_output=True, text=True
        )
        output = (proc.stdout + proc.stderr).strip()
        if proc.returncode != 0:
            print("    [FAIL] exit %d" % proc.returncode)
            failures.append((command, output[-4000:]))
        else:
            print("    [OK]")
    return failures


# --------------------------------------------------------------------------- main


def main(argv=None):
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("brief", help="path to the markdown brief")
    parser.add_argument("--apply", action="store_true", help="actually write files")
    args = parser.parse_args(argv)

    api_key = read_env_value("DEEPSEEK_API_KEY")
    if not api_key:
        sys.exit("[ERR] DEEPSEEK_API_KEY not found in the environment or .env")

    config, task = parse_brief(args.brief)
    model = config.get("model", read_env_value("DEEPSEEK_MODEL") or DEFAULT_MODEL)
    max_iterations = int(config.get("max_iterations", DEFAULT_ITERATIONS))
    allow_paths = config.get("allow_paths") or []
    validate = config.get("validate") or []

    if not validate:
        print("[WARN] no validate commands — the loop cannot self-correct, it will run once")
        max_iterations = 1

    run_dir = RUNS_DIR / datetime.now().strftime("%Y%m%d-%H%M%S")
    run_dir.mkdir(parents=True, exist_ok=True)

    print("[BRIEF] %s" % args.brief)
    print("[MODEL] %s   iterations<=%d   %s" % (
        model, max_iterations, "APPLY" if args.apply else "DRY RUN (nothing is written)"))
    print("[ALLOW] %s" % (", ".join(allow_paths) or "(none — every file will be skipped)"))
    print("[RUN]   %s\n" % run_dir)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": task},
    ]
    total_tokens = 0

    for attempt in range(1, max_iterations + 1):
        print("=== iteration %d/%d — asking DeepSeek..." % (attempt, max_iterations))
        reply, usage = call_deepseek(api_key, model, messages)
        total_tokens += usage.get("total_tokens", 0)
        (run_dir / ("reply-%d.md" % attempt)).write_text(reply, encoding="utf-8")

        written, skipped = apply_files(reply, allow_paths, run_dir, args.apply)
        for rel, why in skipped:
            print("  [SKIP] %s (%s)" % (rel, why))
        for rel in written:
            print("  [%s] %s" % ("WROTE" if args.apply else "WOULD WRITE", rel))
        if not written:
            print("  [WARN] the reply contained no usable file blocks")

        if not args.apply:
            print("\n[DRY RUN] stopping before validation. Re-run with --apply.")
            break

        if not validate:
            break

        print("--- validating")
        failures = run_validation(validate)
        if not failures:
            print("\n[OK] validation passed on iteration %d" % attempt)
            break

        if attempt == max_iterations:
            print("\n[STOP] still failing after %d iterations — hand it to Claude." % attempt)
            print("       Backups of every overwritten file: %s" % (run_dir / "backup"))
            break

        feedback = "\n\n".join(
            "Command failed: %s\n\n%s" % (cmd, out) for cmd, out in failures
        )
        messages.append({"role": "assistant", "content": reply})
        messages.append({
            "role": "user",
            "content": "Validation failed. Fix the code and return the COMPLETE "
                       "content of every file that needs changing, same protocol.\n\n" + feedback,
        })

    summary = {
        "brief": str(args.brief),
        "model": model,
        "applied": args.apply,
        "total_tokens": total_tokens,
        "run_dir": str(run_dir),
    }
    (run_dir / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print("\n[TOKENS] %d (DeepSeek)   [TRANSCRIPT] %s" % (total_tokens, run_dir))
    return 0


if __name__ == "__main__":
    sys.exit(main())
