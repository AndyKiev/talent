<#
  Flip RABBITMQ_ENABLED in the repo-root .env.

  Usage:
    powershell -File scripts\set_rabbit.ps1 -Value true
    powershell -File scripts\set_rabbit.ps1 -Value false

  Used by /start1 (false) and /start2 (true), and by the TALENT-backend
  VSCode task so the flag is correct before uvicorn reads .env.
#>
param([Parameter(Mandatory)][ValidateSet('true','false')][string]$Value)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot          # scripts/ -> repo root
$envFile = Join-Path $repo '.env'

if (-not (Test-Path $envFile)) { throw ".env not found at $envFile" }

$content = Get-Content $envFile -Raw
if ($content -match '(?m)^\s*RABBITMQ_ENABLED\s*=') {
    $new = [regex]::Replace($content, '(?m)^\s*RABBITMQ_ENABLED\s*=.*$', "RABBITMQ_ENABLED=$Value")
} else {
    $sep = if ($content.EndsWith("`n") -or $content.Length -eq 0) { '' } else { "`n" }
    $new = "$content$sep" + "RABBITMQ_ENABLED=$Value`n"
}
# UTF-8 WITHOUT BOM (PS 5.1 -Encoding utf8 adds a BOM that breaks .env parsing).
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($envFile, $new, $utf8NoBom)
Write-Host "RABBITMQ_ENABLED=$Value"
