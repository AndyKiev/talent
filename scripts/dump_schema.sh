#!/usr/bin/env bash
# Dump a COMPACT, diff-stable Postgres schema snapshot to a text file.
# Bash twin of dump_schema.ps1 — use this in TLW (Linux). See /sync-tlw skill.
#
# Writes scripts/schema_snapshot.txt next to this script, sorted alphabetically
# (id-column reorder => no false diff). Sections: COLUMNS, FOREIGN KEYS, INDEXES, ENUMS.
#
# Usage:
#   bash scripts/dump_schema.sh
#   CONTAINER=talent-work-postgres bash scripts/dump_schema.sh   # other container name
set -euo pipefail

CONTAINER="${CONTAINER:-talent-postgres-fresh}"
DB="${DB:-talent}"
USER_="${USER_:-admin}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="${OUT:-$DIR/schema_snapshot.txt}"

if ! docker ps --filter "name=$CONTAINER" --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "Container '$CONTAINER' is not running. Start the DB first, or set CONTAINER=<name>." >&2
  exit 1
fi

psql_q() { docker exec -i "$CONTAINER" psql -U "$USER_" -d "$DB" -t -A -F '|' -c "$1"; }

COLUMNS_SQL="SELECT table_name||'|'||column_name||'|'||data_type||'|null='||is_nullable||'|default='||COALESCE(column_default,'') FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name, column_name;"
FK_SQL="SELECT tc.table_name||'.'||kcu.column_name||' -> '||ccu.table_name||'.'||ccu.column_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name AND tc.table_schema=kcu.table_schema JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name=tc.constraint_name AND ccu.table_schema=tc.table_schema WHERE tc.constraint_type='FOREIGN KEY' AND tc.table_schema='public' ORDER BY 1;"
INDEX_SQL="SELECT tablename||'|'||indexname||'|'||indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename, indexname;"
ENUM_SQL="SELECT t.typname||'|'||string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder) FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid GROUP BY t.typname ORDER BY t.typname;"

{
  echo "# TALENT schema snapshot"
  echo "# container=$CONTAINER db=$DB generated=$(date -Iseconds)"
  echo "# sorted alphabetically; diff this file between TL and TLW."
  echo
  echo "## COLUMNS (table|column|type|null|default)"
  psql_q "$COLUMNS_SQL"
  echo
  echo "## FOREIGN KEYS (table.col -> ref_table.ref_col)"
  psql_q "$FK_SQL"
  echo
  echo "## INDEXES (table|index|def)"
  psql_q "$INDEX_SQL"
  echo
  echo "## ENUMS (type|labels)"
  psql_q "$ENUM_SQL"
} > "$OUT"

echo "Schema snapshot written to: $OUT"
echo "Lines: $(wc -l < "$OUT")"
