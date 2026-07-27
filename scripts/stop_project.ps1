<#
  Stop the TALENT dev stack. Auto-detects which mode is running (/start1 vs /start2):

    - Frees the backend (:8004) and frontend (:4004) ports -> kills uvicorn + vite.
    - Detects mode by the talent-rabbitmq container: if it is running (/start2),
      stops the broker via `make rabbit-down`.
    - Leaves Postgres running on purpose (the native DB always stays up).

  Leaves the named integrated terminals open (their server process is just killed),
  so a later /start1 or /start2 reuses the same panels.

  Usage:
    powershell -File scripts\stop_project.ps1
#>
$ErrorActionPreference = 'Continue'
$repo = Split-Path -Parent $PSScriptRoot          # scripts/ -> repo root

function Stop-Port($name, $port) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($conns) {
        $conns | ForEach-Object { taskkill /PID $_.OwningProcess /T /F 2>$null | Out-Null }
        Write-Host "  stopped $name (port $port freed)"
    } else {
        Write-Host "  $name not running (port $port idle)"
    }
}

Write-Host "TALENT stop -- repo: $repo"

# 1) App servers: free their ports (kills uvicorn / vite process trees).
Stop-Port 'backend'  8004
Stop-Port 'frontend' 4004

# 2) Detect mode by the running RabbitMQ container.
$rabbitRunning = (docker ps --filter 'name=talent-rabbitmq' --filter 'status=running' --format '{{.Names}}') -match 'talent-rabbitmq'

Push-Location $repo
try {
    if ($rabbitRunning) {
        Write-Host "mode /start2 detected (RabbitMQ up) -- stopping broker"
        make rabbit-down
    } else {
        Write-Host "mode /start1 detected (no RabbitMQ)"
    }
} finally {
    Pop-Location
}

# Postgres is intentionally left running (native DB always stays up).
Write-Host "done -- app stopped (Postgres left running)."
