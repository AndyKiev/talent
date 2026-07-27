# Dump the talent database to a plain folder on the local disk.
# Independent of Docker volumes: even a full `docker system prune -a --volumes`
# leaves these files untouched.
#
#   powershell -File scripts\backup_db.ps1
#
# Restore a dump into a running talent-postgres-fresh:
#   docker cp <file> talent-postgres-fresh:/tmp/r.dump
#   docker exec talent-postgres-fresh pg_restore -U admin -d talent --clean --if-exists /tmp/r.dump

param(
    [string]$OutDir    = "C:\Users\andre\TalentBackups",
    [string]$Container = "talent-postgres-fresh",
    [int]$Keep         = 20
)

$ErrorActionPreference = "Stop"

if (-not (docker ps --filter "name=$Container" --format "{{.Names}}")) {
    Write-Error "[ERR] container '$Container' is not running - start it with: make db-up"
}

if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir -Force | Out-Null }

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$name  = "talent_$stamp.dump"
$dest  = Join-Path $OutDir $name

docker exec $Container pg_dump -U admin -d talent -Fc -f "/tmp/$name"
if ($LASTEXITCODE -ne 0) { Write-Error "[ERR] pg_dump failed" }

docker cp "${Container}:/tmp/$name" $dest
docker exec $Container rm -f "/tmp/$name"

$size = [math]::Round((Get-Item $dest).Length / 1MB, 2)
Write-Host "[OK] $dest ($size MB)"

# keep only the newest $Keep dumps
Get-ChildItem $OutDir -Filter "talent_*.dump" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -Skip $Keep |
    ForEach-Object { Remove-Item $_.FullName -Force; Write-Host "[OK] pruned $($_.Name)" }
