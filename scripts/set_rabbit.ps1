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

# Read as UTF-8 explicitly. Get-Content -Raw in PS 5.1 decodes a no-BOM UTF-8
# file as ANSI; rewriting it as UTF-8 then re-expands any non-ASCII bytes
# (e.g. a mojibake comment) on every run, which previously ballooned .env to GBs.
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$content = [System.IO.File]::ReadAllText($envFile, $utf8NoBom)
if ($content -match '(?m)^\s*RABBITMQ_ENABLED\s*=') {
    $new = [regex]::Replace($content, '(?m)^\s*RABBITMQ_ENABLED\s*=.*$', "RABBITMQ_ENABLED=$Value")
} else {
    $sep = if ($content.EndsWith("`n") -or $content.Length -eq 0) { '' } else { "`n" }
    $new = "$content$sep" + "RABBITMQ_ENABLED=$Value`n"
}
# Write UTF-8 WITHOUT BOM (PS 5.1 -Encoding utf8 adds a BOM that breaks .env parsing).
[System.IO.File]::WriteAllText($envFile, $new, $utf8NoBom)
Write-Host "RABBITMQ_ENABLED=$Value"
