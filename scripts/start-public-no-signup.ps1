<#
Start Django dev server and open an SSH tunnel via localhost.run (no signup required).

Usage (PowerShell):
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force
  .\scripts\start-public-no-signup.ps1

Requirements:
- OpenSSH client available (Windows 10+ includes `ssh`).
- Optional: virtualenv at `.venv` (script will try to activate it).
#>

param(
    [int]$Port = 8000
)

Write-Host "Starting public helper (no signup) on port $Port" -ForegroundColor Cyan
try { Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force } catch {}

$projRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
Push-Location $projRoot

# Activate venv if present
$venvActivate = Join-Path $projRoot "..\.venv\Scripts\Activate.ps1"
if (Test-Path $venvActivate) {
    Write-Host "Activating virtualenv..." -ForegroundColor Green
    try { & $venvActivate } catch { Write-Warning "Failed to activate venv." }
} else { Write-Warning "Virtualenv not found at .\.venv; continuing if python is on PATH." }

# Verify Python
try { & python --version > $null 2>&1; Write-Host "Python found." -ForegroundColor Green } catch { Write-Error "Python not found. Aborting."; Pop-Location; exit 1 }

# Start Django dev server in a new window so this script can continue
Write-Host "Starting Django dev server on 0.0.0.0:$Port..." -ForegroundColor Cyan
Start-Process -FilePath python -ArgumentList "manage.py runserver 0.0.0.0:$Port" -WorkingDirectory (Resolve-Path "$projRoot\..")

# Start SSH tunnel using localhost.run (no signup). This will print the public URL in the SSH window.
Write-Host "Starting SSH tunnel to localhost.run (no signup)..." -ForegroundColor Cyan
try {
    $sshArgs = @("-o", "StrictHostKeyChecking=no", "-R", "80:localhost:$Port", "ssh.localhost.run")
    Start-Process -FilePath ssh -ArgumentList $sshArgs -WorkingDirectory (Resolve-Path "$projRoot\..")
    Write-Host "SSH tunnel started. Check the SSH window for your public URL (looks like https://<id>.localhost.run)." -ForegroundColor Green
} catch {
    Write-Warning "Failed to start SSH tunnel. Ensure 'ssh' is available on PATH and try the command manually: ssh -R 80:localhost:$Port ssh.localhost.run"
}

Pop-Location
Write-Host "Done." -ForegroundColor Cyan
