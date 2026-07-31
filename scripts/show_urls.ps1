<#
  Print the URL to open the TALENT frontend from ANY device, and say whether the
  stack is actually listening.

  Vite prints one URL per network interface (corporate LAN, home wifi, and the
  Docker/WSL virtual adapters no phone can ever reach), which leaves it ambiguous
  which one to type on a tablet. This prints only the reachable ones.

  Usage:
    powershell -File scripts\show_urls.ps1            # print now
    powershell -File scripts\show_urls.ps1 -Wait      # wait for the server first

  Run as the last step of /start1 (Ctrl+Alt+1) and /start2 (Ctrl+Alt+2).
#>
param(
    # Poll until the frontend port answers, so the banner does not print "[ERR]
    # down" while vite is still booting inside a parallel compound task.
    [switch]$Wait,
    [int]$WaitSeconds = 60
)
$ErrorActionPreference = 'Stop'

$FrontendPort = 4004
$BackendPort  = 8004

$repo = Split-Path -Parent $PSScriptRoot          # scripts/ -> repo root

# ── Canonical hostname (first entry of VITE_ALLOWED_HOSTS) ────────────────────
# Vite rejects any Host header not in that list, so it is the single source of
# truth for which name this dev server answers to.
$devEnv = Join-Path $repo 'frontend\.env.development'
$hostName = $null
if (Test-Path $devEnv) {
    $line = Select-String -Path $devEnv -Pattern '^\s*VITE_ALLOWED_HOSTS\s*=(.*)$' |
            Select-Object -First 1
    if ($line) {
        $hostName = ($line.Matches[0].Groups[1].Value -split ',')[0].Trim()
    }
}

function Test-Listening([int]$Port) {
    $null -ne (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue |
               Select-Object -First 1)
}

# ── OSC 8 terminal hyperlink ──────────────────────────────────────────────────
# Lets the line READ like the future production url (no port) while still
# opening the real dev port when clicked. Only emitted in terminals that render
# it - anywhere else the raw escape codes would be visible garbage, so fall back
# to the plain url with its port.
$ESC = [char]27
$supportsLinks = ($env:TERM_PROGRAM -eq 'vscode') -or $env:WT_SESSION
function Format-Link([string]$Url, [string]$Text) {
    if ($supportsLinks) { "$ESC]8;;$Url$ESC\$Text$ESC]8;;$ESC\" } else { $Url }
}

if ($Wait) {
    $deadline = (Get-Date).AddSeconds($WaitSeconds)
    while (-not (Test-Listening $FrontendPort) -and (Get-Date) -lt $deadline) {
        Start-Sleep -Milliseconds 500
    }
}

# ── Reachable LAN addresses ───────────────────────────────────────────────────
# Only interfaces WITH a default gateway are real networks. That single filter
# removes the Docker/WSL/Hyper-V vEthernet addresses, which is exactly the noise
# in vite's own list.
$lan = @(
    Get-NetIPConfiguration |
        Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' } |
        ForEach-Object {
            [pscustomobject]@{
                Adapter = $_.InterfaceAlias
                Address = $_.IPv4Address.IPAddress
            }
        } |
        Where-Object { $_.Address -and $_.Address -notlike '169.254.*' }
)

$feUp = Test-Listening $FrontendPort
$beUp = Test-Listening $BackendPort

# ── Report ────────────────────────────────────────────────────────────────────
Write-Host ''
Write-Host 'TALENT - open the app from any device' -ForegroundColor Cyan
Write-Host '-------------------------------------'

if ($hostName) {
    $real = "http://${hostName}:${FrontendPort}/auth/login"
    Write-Host ('  by name    ' + (Format-Link $real "http://$hostName/auth/login")) -ForegroundColor Green
    Write-Host ("             needs a DNS record '{0}' -> this PC (click the link; typing it needs :{1})" -f $hostName, $FrontendPort) -ForegroundColor DarkGray
} else {
    Write-Host '  by name    [WARN] VITE_ALLOWED_HOSTS not set in frontend/.env.development' -ForegroundColor Yellow
}

Write-Host ''
if ($lan.Count -eq 0) {
    Write-Host '  by address [WARN] no network adapter with a default gateway - not on any wifi/LAN' -ForegroundColor Yellow
} else {
    # The port stays visible here on purpose: these are typed by hand on a phone.
    foreach ($n in $lan) {
        Write-Host ("  by address http://{0}:{1}/auth/login" -f $n.Address, $FrontendPort) -ForegroundColor Green
        Write-Host ("             via {0}" -f $n.Adapter) -ForegroundColor DarkGray
    }
}

Write-Host ''
Write-Host ("  this PC    http://localhost:{0}/auth/login" -f $FrontendPort)
Write-Host ''
Write-Host ("  frontend :{0}  {1}" -f $FrontendPort, $(if ($feUp) { '[OK] listening' } else { '[ERR] down' })) `
    -ForegroundColor $(if ($feUp) { 'Green' } else { 'Red' })
Write-Host ("  backend  :{0}  {1}" -f $BackendPort,  $(if ($beUp) { '[OK] listening' } else { '[ERR] down' })) `
    -ForegroundColor $(if ($beUp) { 'Green' } else { 'Red' })
Write-Host ''
Write-Host '  The API is same-origin (/api/v1) - no separate URL, no CORS.' -ForegroundColor DarkGray
Write-Host ''
