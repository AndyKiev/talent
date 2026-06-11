<#
.SYNOPSIS
  Dump a COMPACT, diff-stable Postgres schema snapshot to a text file.

.DESCRIPTION
  Used by the /sync-tlw skill to compare the TALENT (TL) database against the
  talent-work (TLW) database CHEAPLY. Instead of reading migrations/models (token
  heavy), we snapshot the live schema from information_schema into a small, sorted
  text file. Run it in BOTH repos, then diff the two files — only the diff is read.

  Output is written NEXT TO THIS SCRIPT as `schema_snapshot.txt`, so whichever repo
  runs it gets its own local snapshot:
    TL  -> C:\Users\andre\Projects\talent\scripts\schema_snapshot.txt
    TLW -> C:\Users\andre\Projects\talent-work\scripts\schema_snapshot.txt

  Sorted alphabetically (NOT by ordinal) so an id-column reorder does not create
  false diffs. Sections: COLUMNS, FOREIGN KEYS, INDEXES, ENUMS.

.PARAMETER Container
  Name of the running Postgres docker container. Default: talent-postgres-fresh.

.PARAMETER Db / User
  Database name / user inside the container. Default: talent / admin.

.PARAMETER OutFile
  Override output path. Default: <script dir>\schema_snapshot.txt

.EXAMPLE
  powershell -File scripts\dump_schema.ps1
  # TLW (if its container has another name):
  powershell -File scripts\dump_schema.ps1 -Container talent-work-postgres
#>
param(
  [string]$Container = "talent-postgres-fresh",
  [string]$Db        = "talent",
  [string]$User      = "admin",
  [string]$OutFile   = (Join-Path $PSScriptRoot "schema_snapshot.txt")
)

$ErrorActionPreference = "Stop"

function Invoke-Psql([string]$sql) {
  # -t tuples only, -A unaligned, -F '|' pipe-separated -> stable, compact, grep-able
  docker exec -i $Container psql -U $User -d $Db -t -A -F '|' -c $sql
}

# Fail fast with a clear message if the container is not up.
$running = docker ps --filter "name=$Container" --format "{{.Names}}"
if (-not ($running -split "`n" | Where-Object { $_.Trim() -eq $Container })) {
  Write-Error "Container '$Container' is not running. Start the DB first (e.g. 'make db-up'), or pass -Container <name>."
}

$columnsSql = @"
SELECT table_name || '|' || column_name || '|' || data_type
       || '|null=' || is_nullable
       || '|default=' || COALESCE(column_default, '')
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, column_name;
"@

$fkSql = @"
SELECT tc.table_name || '.' || kcu.column_name || ' -> '
       || ccu.table_name || '.' || ccu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
ORDER BY 1;
"@

$indexSql = @"
SELECT tablename || '|' || indexname || '|' || indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
"@

$enumSql = @"
SELECT t.typname || '|' || string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder)
FROM pg_type t
JOIN pg_enum e ON e.enumtypid = t.oid
GROUP BY t.typname
ORDER BY t.typname;
"@

$lines = @()
$lines += "# TALENT schema snapshot"
$lines += "# container=$Container db=$Db generated=$(Get-Date -Format o)"
$lines += "# sorted alphabetically; diff this file between TL and TLW."
$lines += ""
$lines += "## COLUMNS (table|column|type|null|default)"
$lines += (Invoke-Psql $columnsSql)
$lines += ""
$lines += "## FOREIGN KEYS (table.col -> ref_table.ref_col)"
$lines += (Invoke-Psql $fkSql)
$lines += ""
$lines += "## INDEXES (table|index|def)"
$lines += (Invoke-Psql $indexSql)
$lines += ""
$lines += "## ENUMS (type|labels)"
$lines += (Invoke-Psql $enumSql)

# Strip empty trailing whitespace lines from psql, keep section structure.
$lines = $lines | ForEach-Object { $_.TrimEnd() }

Set-Content -Path $OutFile -Value $lines -Encoding utf8
Write-Host "Schema snapshot written to: $OutFile"
Write-Host "Lines: $($lines.Count)"
