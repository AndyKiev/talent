#!/bin/sh
# Build a /delegate recon brief from ArjanCodes example dirs WITHOUT the source
# entering Claude's context.
#   Usage: fetch_arjan.sh <out.md> <dir under 2026/> [<dir> ...]
#
# The GitHub *contents* API rate-limits an unauthenticated per-directory walk after
# a handful of calls (empty body -> JSONDecodeError). So: fetch the whole tree in
# ONE call, then pull blobs from raw.githubusercontent.com, which is not throttled.
set -e
OUT="$1"; shift
HERE="$(dirname "$0")"
TREE="${TMPDIR:-/tmp}/arjan_tree.json"
API="https://api.github.com/repos/ArjanCodes/examples/git/trees/main?recursive=1"
RAW="https://raw.githubusercontent.com/ArjanCodes/examples/main"

[ -s "$TREE" ] || curl -s "$API" -o "$TREE"

cat "$HERE/recon_pattern_head.md" > "$OUT"
for d in "$@"; do
  echo "# ===== directory: 2026/$d =====" >> "$OUT"
  echo >> "$OUT"
  # JSON goes in on stdin: a Git Bash path like /tmp/x.json is invisible to the
  # Windows python.exe, so never hand it a POSIX path as an argument.
  python -c "
import json, sys
d = sys.argv[1]
skip = ('uv.lock', 'pyproject.toml', 'docker-compose.yml', '.gitignore', '__init__.py')
for x in json.load(sys.stdin)['tree']:
    p = x['path']
    if x['type'] == 'blob' and p.startswith('2026/%s/' % d) and not p.endswith(skip):
        print(p)
" "$d" < "$TREE" | tr -d '\r' | while read p; do   # python on Windows emits CRLF
    echo "## $p" >> "$OUT"
    case "$p" in
      *.py)   echo '```python' >> "$OUT" ;;
      *.json) echo '```json'   >> "$OUT" ;;
      *)      echo '```'       >> "$OUT" ;;
    esac
    curl -s "$RAW/$p" >> "$OUT"
    echo '```' >> "$OUT"
    echo >> "$OUT"
  done
done
echo "[OK] $OUT $(wc -c < "$OUT") bytes, $(grep -c '^## 2026' "$OUT") files"
