# Start / stop / inspect the native PostgreSQL 18 cluster that holds `talent`.
#
# The cluster lives in the user's own folder (not Program Files, not Docker),
# so no administrator rights and no Docker daemon are needed.
#
#   powershell -File scripts\db.ps1 start
#   powershell -File scripts\db.ps1 stop
#   powershell -File scripts\db.ps1 status

param(
    [ValidateSet("start", "stop", "status", "restart")]
    [string]$Action = "status",

    [string]$DataDir = "C:\Users\andre\PostgresData\talent",
    [string]$LogFile = "C:\Users\andre\PostgresData\talent.log",
    [int]$Port       = 5433
)

$ErrorActionPreference = "Stop"
$pgctl = "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe"

if (-not (Test-Path $pgctl)) { Write-Error "[ERR] pg_ctl not found at $pgctl" }

switch ($Action) {
    "start" {
        & $pgctl -D $DataDir -l $LogFile -o "-p $Port" start
        Write-Host "[OK] talent db listening on 127.0.0.1:$Port"
    }
    "stop" {
        & $pgctl -D $DataDir stop
        Write-Host "[OK] talent db stopped"
    }
    "restart" {
        & $pgctl -D $DataDir -l $LogFile -o "-p $Port" restart
        Write-Host "[OK] talent db restarted on 127.0.0.1:$Port"
    }
    "status" {
        & $pgctl -D $DataDir status
    }
}
