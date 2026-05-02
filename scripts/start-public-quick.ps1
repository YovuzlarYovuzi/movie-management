<#
Start dev server and expose it publicly without sign-up.

This script attempts two no-signup tunnels (in order):
  1) localhost.run via SSH (no account required): opens tunnel with `ssh -R 80:localhost:8000 ssh.localhost.run`
  2) localtunnel via npx (no account required): `npx localtunnel --port 8000`

It starts the Django dev server on 0.0.0.0:8000 and runs the chosen tunnel in a new window.

Usage (PowerShell):
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force
  .\scripts\start-public-quick.ps1

Requirements:

Security: Dev server is not production-ready. Use only for short testing.
#>

param(
    [int]$Port = 8000
)

Write-Host "Quick public start (port $Port)" -ForegroundColor Cyan

try { Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force } catch {}

$projRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
Push-Location $projRoot

# Activate venv if present
$venvActivate = Join-Path $projRoot "..\.venv\Scripts\Activate.ps1"
if (Test-Path $venvActivate) {
    Write-Host "Activating virtualenv..." -ForegroundColor Green
    try { & $venvActivate } catch { Write-Warning "Failed to activate venv." }
}

# Check python
try { & python --version >$null 2>&1; $pyOk = $true } catch { $pyOk = $false }
if (-not $pyOk) { Write-Error "Python not found. Install Python or create .venv first."; Pop-Location; exit 1 }

# Start Django server in background window
Write-Host "Starting Django dev server on 0.0.0.0:$Port..." -ForegroundColor Cyan
Start-Process -FilePath python -ArgumentList "manage.py runserver 0.0.0.0:$Port" -WorkingDirectory (Resolve-Path "$projRoot\..")

# Try localhost.run via ssh
try {
    & ssh -V >$null 2>&1
    $sshOk = $true
} catch { $sshOk = $false }

if ($sshOk) {
    Write-Host "SSH available — starting localhost.run tunnel (no signup)..." -ForegroundColor Green
    Start-Process -FilePath ssh -ArgumentList "-R 80:localhost:$Port ssh.localhost.run" -WorkingDirectory (Resolve-Path "$projRoot\..")
    Write-Host "SSH tunnel started. Watch the SSH window — it prints the public URL." -ForegroundColor Green
    Pop-Location
    return
}

# Fallback: localtunnel via npx
try { & npx --version >$null 2>&1; $npxOk = $true } catch { $npxOk = $false }
if ($npxOk) {
    Write-Host "npx available — starting localtunnel (no signup) ..." -ForegroundColor Green
    Start-Process -FilePath npx -ArgumentList "localtunnel --port $Port" -WorkingDirectory (Resolve-Path "$projRoot\..")
    Write-Host "localtunnel started. Check the new window for the public URL." -ForegroundColor Green
    Pop-Location
    return
}

Write-Warning "No tunnel tool found. Install either OpenSSH (ssh) or Node.js (npx) to create a tunnel without signup."
Write-Host "Options:" -ForegroundColor Cyan
Write-Host "  - Use built-in OpenSSH: 'ssh -R 80:localhost:8000 ssh.localhost.run' (no signup)." -ForegroundColor Yellow
Write-Host "  - Or install Node.js and run: 'npx localtunnel --port 8000'" -ForegroundColor Yellow

Pop-Location
