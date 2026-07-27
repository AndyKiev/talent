# Dump the talent database to a plain folder on the local disk.
#
#   powershell -File scripts\backup_db.ps1
#
# Restore one of these dumps back into an empty talent database:
#   powershell -File scripts\restore_db.ps1 -File <path-to-.dump>

param(
    [string]$OutDir = "C:\Users\andre\TalentBackups",
    [string]$DbHost = "127.0.0.1",
    [int]$Port      = 5433,
    [string]$Db     = "talent",
    [string]$User   = "admin",
    [int]$Keep      = 20
)

$ErrorActionPreference = "Stop"
$pgdump = "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe"

if (-not (Test-Path $pgdump)) { Write-Error "[ERR] pg_dump not found at $pgdump" }
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir -Force | Out-Null }

if (-not $env:PGPASSWORD) { $env:PGPASSWORD = "admin12345" }

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$dest  = Join-Path $OutDir "talent_$stamp.dump"

& $pgdump -U $User -h $DbHost -p $Port -d $Db -Fc -f $dest
if ($LASTEXITCODE -ne 0) { Write-Error "[ERR] pg_dump failed - is the db running? (make db-status)" }

$size = [math]::Round((Get-Item $dest).Length / 1MB, 2)
Write-Host "[OK] $dest ($size MB)"

# keep only the newest $Keep dumps
Get-ChildItem $OutDir -Filter "talent_*.dump" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -Skip $Keep |
    ForEach-Object { Remove-Item $_.FullName -Force; Write-Host "[OK] pruned $($_.Name)" }
