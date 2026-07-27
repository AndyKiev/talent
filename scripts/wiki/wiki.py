"""TALENT knowledge-vault CLI (Obsidian wiki loop).

Stdlib only - runs with any python 3.9+, no venv needed.

Vault path comes from LLM_OBSIDIAN_VAULT in the repo-root .env
(or the LLM_OBSIDIAN_VAULT environment variable, which wins).

Subcommands
-----------
    lint            report dead links, ambiguous basenames, empty pages, orphans
    index           regenerate index.md (catalog of every page)
    hot --print     print hot.md (used by the SessionStart hook)
    hot --note TEXT append a line to the current hot.md session block
    hot --rotate    start a new session block, trimming old ones

Exit codes: 0 = clean, 1 = lint findings, 2 = vault not found.
"""

import argparse
import os
import re
import sys
from datetime import date, datetime
from pathlib import Path

VAULT_ENV_KEY = "LLM_OBSIDIAN_VAULT"

# Candidate .env files, in priority order. cwd comes first so the script keeps
# working when it is installed outside the project (e.g. copied into another
# repo, or into ~/.claude/skills/) and run from that project's root.
ENV_FILES = [
    Path.cwd() / ".env",
    Path(__file__).resolve().parents[2] / ".env",
]

# Pages that are machinery, not knowledge - excluded from orphan checks.
MACHINERY = {"index.md", "hot.md"}
EMPTY_THRESHOLD = 40  # chars of body text below which a page counts as a stub
HOT_MAX_SESSIONS = 5

WIKILINK_RE = re.compile(r"\[\[([^\[\]]+)\]\]")
FRONTMATTER_RE = re.compile(r"\A---\r?\n(.*?)\r?\n---\r?\n", re.DOTALL)


# --------------------------------------------------------------------------- vault


def read_env_vault():
    override = os.environ.get(VAULT_ENV_KEY)
    if override:
        return override
    for env_file in ENV_FILES:
        if not env_file.exists():
            continue
        for raw in env_file.read_text(encoding="utf-8", errors="replace").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            if key.strip() == VAULT_ENV_KEY:
                return value.strip().strip('"').strip("'")
    return None


def get_vault():
    raw = read_env_vault()
    if not raw:
        sys.stderr.write(
            "[ERR] %s is not set (checked the environment, then %s)\n"
            % (VAULT_ENV_KEY, ", ".join(str(f) for f in ENV_FILES))
        )
        sys.exit(2)
    vault = Path(raw)
    if not vault.is_dir():
        sys.stderr.write("[ERR] vault path does not exist: %s\n" % vault)
        sys.exit(2)
    return vault


def pages(vault):
    """Every markdown page in the vault, excluding Obsidian's own config."""
    out = []
    for path in sorted(vault.rglob("*.md")):
        rel = path.relative_to(vault)
        if any(part.startswith(".") for part in rel.parts):
            continue
        out.append(path)
    return out


def body_of(text):
    """Page text with YAML frontmatter stripped."""
    match = FRONTMATTER_RE.match(text)
    return text[match.end():] if match else text


def link_targets(text):
    """Wikilink targets, normalised: alias, heading and block refs removed."""
    out = []
    for inner in WIKILINK_RE.findall(text):
        target = inner.split("|", 1)[0].split("#", 1)[0].split("^", 1)[0].strip()
        if target:
            out.append(target)
    return out


def resolve(target, by_basename, by_relpath):
    """Obsidian resolution: exact relative path first, then unique basename."""
    key = target.replace("\\", "/").lower()
    if key.endswith(".md"):
        key = key[:-3]
    if key in by_relpath:
        return [by_relpath[key]]
    return by_basename.get(key.rsplit("/", 1)[-1], [])


def build_maps(vault, page_paths):
    by_basename = {}
    by_relpath = {}
    for path in page_paths:
        rel = path.relative_to(vault).as_posix()
        by_relpath[rel[:-3].lower()] = path
        by_basename.setdefault(path.stem.lower(), []).append(path)
    return by_basename, by_relpath


# --------------------------------------------------------------------------- lint


def cmd_lint(args):
    vault = get_vault()
    page_paths = pages(vault)
    by_basename, by_relpath = build_maps(vault, page_paths)

    dead, ambiguous, stubs, folder_refs = [], [], [], []
    inbound = {p: 0 for p in page_paths}

    for path in page_paths:
        rel = path.relative_to(vault).as_posix()
        text = path.read_text(encoding="utf-8", errors="replace")
        if len(body_of(text).strip()) < EMPTY_THRESHOLD:
            stubs.append((rel, len(body_of(text).strip())))
        for target in link_targets(text):
            if target.endswith("/"):
                folder_refs.append((rel, target))
                continue
            hits = resolve(target, by_basename, by_relpath)
            if not hits:
                dead.append((rel, target))
            elif len(hits) > 1:
                ambiguous.append((rel, target, [h.relative_to(vault).as_posix() for h in hits]))
                for hit in hits:
                    inbound[hit] += 1
            else:
                inbound[hits[0]] += 1

    orphans = [
        p.relative_to(vault).as_posix()
        for p in page_paths
        if inbound[p] == 0 and p.name not in MACHINERY and p.parent != vault
    ]

    print("[VAULT] %s" % vault)
    print("[PAGES] %d" % len(page_paths))
    _section("DEAD LINKS", ["%s -> [[%s]]" % (src, t) for src, t in dead])
    _section(
        "AMBIGUOUS",
        ["%s -> [[%s]] matches %s" % (src, t, ", ".join(h)) for src, t, h in ambiguous],
    )
    _section("STUBS", ["%s (%d chars)" % (rel, n) for rel, n in stubs])
    _section("ORPHANS", orphans)
    _section("FOLDER REFS", ["%s -> [[%s]]" % (src, t) for src, t in folder_refs])

    findings = len(dead) + len(ambiguous) + len(stubs) + len(orphans)
    print("\n[SUMMARY] dead=%d ambiguous=%d stubs=%d orphans=%d folder_refs=%d"
          % (len(dead), len(ambiguous), len(stubs), len(orphans), len(folder_refs)))
    return 1 if findings and not args.soft else 0


def _section(title, lines):
    print("\n== %s (%d)" % (title, len(lines)))
    for line in lines:
        print("  - %s" % line)


# --------------------------------------------------------------------------- index


def summarize(text):
    """First sentence of the body, with wrapped lines joined."""
    collected = []
    for line in body_of(text).splitlines():
        line = line.strip()
        if not line or line.startswith(("#", ">", "---", "|", "```", "*Generated")):
            if collected:
                break
            continue
        collected.append(re.sub(r"^[-*]\s+", "", line))
        if "." in line:
            break
    if not collected:
        return ""
    sentence = " ".join(collected)
    sentence = re.sub(r"[*`\[\]]", "", sentence)
    head, sep, _ = sentence.partition(". ")
    return (head + "." if sep else sentence)[:160]


def cmd_index(args):
    vault = get_vault()
    page_paths = [p for p in pages(vault) if p.name not in MACHINERY]

    by_folder = {}
    for path in page_paths:
        rel = path.relative_to(vault)
        folder = rel.parent.as_posix() if rel.parent.as_posix() != "." else "(root)"
        by_folder.setdefault(folder, []).append(path)

    out = [
        "---",
        "derived: true",
        "source: scripts/wiki/wiki.py index",
        "updated: %s" % date.today().isoformat(),
        "---",
        "",
        "# Vault Index",
        "",
        "> Auto-generated catalog of every page. **Do not hand-edit** - regenerate with",
        "> `python scripts/wiki/wiki.py index`. The hand-written map of content is",
        "> [[TALENT Project Home]].",
        "",
    ]
    for folder in sorted(by_folder):
        out.append("## %s" % folder)
        for path in sorted(by_folder[folder]):
            text = path.read_text(encoding="utf-8", errors="replace")
            summary = summarize(text)
            out.append("- [[%s]]%s" % (path.stem, (" - " + summary) if summary else ""))
        out.append("")

    target = vault / "index.md"
    target.write_text("\n".join(out).rstrip() + "\n", encoding="utf-8")
    print("[OK] wrote %s (%d pages, %d folders)" % (target, len(page_paths), len(by_folder)))
    return 0


# --------------------------------------------------------------------------- hot


HOT_HEADER = [
    "---",
    "derived: true",
    "source: scripts/wiki/wiki.py hot",
    "---",
    "",
    "# Hot cache",
    "",
    "> Rolling short-term memory: the last few working sessions. Loaded at session",
    "> start. Anything here that still matters in a week belongs in a real page -",
    "> file it with `/wiki-save`.",
    "",
]


def hot_path(vault):
    return vault / "hot.md"


def read_hot(vault):
    path = hot_path(vault)
    if path.exists():
        return path.read_text(encoding="utf-8", errors="replace")
    return "\n".join(HOT_HEADER)


def cmd_hot(args):
    vault = get_vault()
    path = hot_path(vault)
    text = read_hot(vault)

    if args.print_:
        sys.stdout.write(text)
        return 0

    if args.rotate:
        blocks = text.split("\n## ")
        head, sessions = blocks[0], blocks[1:]
        sessions = sessions[-(HOT_MAX_SESSIONS - 1):] if HOT_MAX_SESSIONS > 1 else []
        stamp = datetime.now().strftime("%Y-%m-%d %H:%M")
        rebuilt = head.rstrip() + "\n\n"
        for block in sessions:
            rebuilt += "## " + block.rstrip() + "\n\n"
        rebuilt += "## %s\n" % stamp
        path.write_text(rebuilt, encoding="utf-8")
        print("[OK] rotated %s (kept %d prior sessions)" % (path, len(sessions)))
        return 0

    if args.note:
        if "\n## " not in text:
            text = text.rstrip() + "\n\n## %s\n" % datetime.now().strftime("%Y-%m-%d %H:%M")
        path.write_text(text.rstrip() + "\n- %s\n" % args.note, encoding="utf-8")
        print("[OK] noted in %s" % path)
        return 0

    sys.stdout.write(text)
    return 0


# --------------------------------------------------------------------------- main


def main(argv=None):
    # The vault holds Cyrillic page names; a cp1251/cp866 console would mangle
    # them (or crash the SessionStart hook, which pipes `hot --print`).
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")

    parser = argparse.ArgumentParser(prog="wiki", description=__doc__)
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_lint = sub.add_parser("lint", help="report vault health")
    p_lint.add_argument("--soft", action="store_true", help="always exit 0")
    p_lint.set_defaults(func=cmd_lint)

    p_index = sub.add_parser("index", help="regenerate index.md")
    p_index.set_defaults(func=cmd_index)

    p_hot = sub.add_parser("hot", help="read or update hot.md")
    p_hot.add_argument("--print", dest="print_", action="store_true")
    p_hot.add_argument("--note", help="append a bullet to the current session block")
    p_hot.add_argument("--rotate", action="store_true", help="start a new session block")
    p_hot.set_defaults(func=cmd_hot)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
