#!/usr/bin/env bash
# ============================================================================
# Dump the NON-people-review DATA from the talent-test (TLW-on-Linux) database
# so it can be imported into TL after the structure alignment (Phase 2).
#
# Produces a single plain-SQL, DATA-ONLY file (COPY blocks) that you send back.
# talent-test has NO people-review tables, so a full data-only dump == all the
# data we want. The alembic_version row is intentionally excluded (TL keeps its
# own migration lineage).
#
# USAGE (pick ONE mode):
#
#   # A) talent-test runs in Docker (most likely):
#   CONTAINER=<talent_test_pg_container> bash scripts/dump_talent_test_data.sh
#
#   # B) native PostgreSQL on the host:
#   MODE=native PGHOST=127.0.0.1 PGPORT=5432 PGUSER=admin PGDATABASE=talent \
#        bash scripts/dump_talent_test_data.sh
#
# Override the DB name / user if different:
#   CONTAINER=mypg DB=talent USER_=admin bash scripts/dump_talent_test_data.sh
#
# The password: set PGPASSWORD=... in the environment if your server requires it.
# Output -> scripts/talent_test_data.sql   (send this file back)
# ============================================================================
set -euo pipefail

MODE="${MODE:-docker}"                 # docker | native
CONTAINER="${CONTAINER:-talent-postgres-fresh}"
DB="${DB:-talent}"
USER_="${USER_:-admin}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="${OUT:-$DIR/talent_test_data.sql}"

# Tables whose DATA we never want to carry over (migration bookkeeping).
EXCLUDE_DATA=( "alembic_version" )

# Build the shared pg_dump flag list.
DUMP_FLAGS=( --data-only --no-owner --no-privileges --disable-triggers
             --column-inserts )
for t in "${EXCLUDE_DATA[@]}"; do
  DUMP_FLAGS+=( "--exclude-table-data=public.${t}" )
done

echo "Dumping DATA-ONLY from db='$DB' (mode=$MODE) ..."

if [ "$MODE" = "native" ]; then
  # Relies on PGHOST/PGPORT/PGUSER/PGDATABASE/PGPASSWORD env (or defaults).
  PGDATABASE="${PGDATABASE:-$DB}" PGUSER="${PGUSER:-$USER_}" \
    pg_dump "${DUMP_FLAGS[@]}" > "$OUT"
else
  if ! docker ps --filter "name=$CONTAINER" --format '{{.Names}}' | grep -qx "$CONTAINER"; then
    echo "Container '$CONTAINER' is not running." >&2
    echo "List candidates:  docker ps --format '{{.Names}}\t{{.Image}}'" >&2
    echo "Then re-run:       CONTAINER=<name> bash scripts/dump_talent_test_data.sh" >&2
    exit 1
  fi
  # -i (no -t) so output is clean; pass PGPASSWORD through if set.
  docker exec -e PGPASSWORD="${PGPASSWORD:-}" -i "$CONTAINER" \
    pg_dump "${DUMP_FLAGS[@]}" -U "$USER_" -d "$DB" > "$OUT"
fi

# Quick summary so you can sanity-check before sending it back.
ROWS=$(grep -c '^INSERT INTO' "$OUT" || true)
TABLES=$(grep -oE '^INSERT INTO [^ ]+' "$OUT" | sort -u | wc -l | tr -d ' ')
echo "----------------------------------------------------------------------"
echo "Wrote:   $OUT"
echo "Size:    $(du -h "$OUT" | cut -f1)"
echo "INSERTs: $ROWS  across ~$TABLES tables"
echo "Includes msg_keys + msgs (translations) and all non-people-review data."
echo "Send '$OUT' back. Phase 2 imports it into TL after the structure merge."
