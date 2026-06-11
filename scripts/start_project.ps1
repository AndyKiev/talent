<#
  Start the TALENT dev stack in named PowerShell windows.

    Mode 1 (/start1):  db + backend + frontend            (no RabbitMQ)
    Mode 2 (/start2):  db + rabbit + backend + frontend   (with RabbitMQ)

  One window per role (titles: TALENT-db / TALENT-rabbit / TALENT-backend /
  TALENT-frontend). On each run a role is RESTARTED, not duplicated: the old
  window's process tree is killed (the Ctrl+C) and the port is freed, then a
  fresh window launches the matching make target.

  Usage:
    powershell -File scripts\start_project.ps1 -Mode 1
    powershell -File scripts\start_project.ps1 -Mode 2
#>
param([ValidateSet('1','2')][string]$Mode = '1')

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot                       # scripts/ -> repo root
$venv = Join-Path $repo 'backend\.venv\Scripts\Activate.ps1'   # backend virtualenv

function Stop-Role($title, $port) {
    # Kill the whole process tree of our titled window (powershell -> make -> server).
    Get-Process powershell, pwsh -ErrorAction SilentlyContinue |
        Where-Object { $_.MainWindowTitle -eq $title } |
        ForEach-Object { taskkill /PID $_.Id /T /F 2>$null | Out-Null }
    # Also free the port from any server started outside this script.
    if ($port) {
        Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
            ForEach-Object { taskkill /PID $_.OwningProcess /T /F 2>$null | Out-Null }
    }
}

function Start-Role($title, $command, $port) {
    Stop-Role $title $port
    $inner = "`$host.ui.RawUI.WindowTitle = '$title'; $command"
    Start-Process powershell -WorkingDirectory $repo `
        -ArgumentList '-NoExit', '-NoProfile', '-Command', $inner
    Write-Host "  started $title"
}

Write-Host "TALENT start (mode $Mode) -- repo: $repo"

# 1) Infra first (idempotent `docker start`)
Start-Role 'TALENT-db' 'make db-up' $null
if ($Mode -eq '2') { Start-Role 'TALENT-rabbit' 'make rabbit-up' $null }

# 2) App servers (long-running; stale port owner is killed first)
Start-Role 'TALENT-backend' "& '$venv'; make run-backend" 8004
Start-Role 'TALENT-frontend' 'make run-frontend' 4004

$n = if ($Mode -eq '2') { 4 } else { 3 }
Write-Host "done -- $n windows up."
