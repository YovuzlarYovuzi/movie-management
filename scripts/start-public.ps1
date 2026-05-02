<#
Starts the Django dev server on 0.0.0.0:8000 and (optionally) starts ngrok if `ngrok.exe` is present

Usage (PowerShell):
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force
  .\scripts\start-public.ps1

Place your `ngrok.exe` in the project root if you want an automatic tunnel started.
This script assumes a virtualenv at `.\.venv` (created by the project's README).
#>

param(
    [int]$Port = 8000
)

Write-Host "Starting public dev helper (port $Port)" -ForegroundColor Cyan

# Ensure scripts can run for this session
try { Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force } catch {}

$projRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
Push-Location $projRoot

# Activate venv if present
$venvActivate = Join-Path $projRoot "..\.venv\Scripts\Activate.ps1"
if (Test-Path $venvActivate) {
    Write-Host "Activating virtualenv..." -ForegroundColor Green
    try {
        & $venvActivate
    } catch {
        Write-Warning "Failed to activate venv via Activate.ps1, continuing without activation."
    }
} else {
    Write-Warning "Virtualenv not found at .\.venv; ensure Python is available on PATH or create .venv first." -ForegroundColor Yellow
}

# Check python availability
try {
    $py = & python --version 2>$null
    Write-Host "Python detected: $py" -ForegroundColor Green
} catch {
    Write-Error "Python not found. Activate your environment or install Python. Aborting."
    Pop-Location
    exit 1
}

# Start Django dev server in a new window
Write-Host "Starting Django dev server on 0.0.0.0:$Port..." -ForegroundColor Cyan
Start-Process -FilePath python -ArgumentList "manage.py runserver 0.0.0.0:$Port" -WorkingDirectory (Resolve-Path "$projRoot\..") -NoNewWindow

# Start ngrok if present in project root
$ngrokPath = Join-Path $projRoot "..\ngrok.exe"
if (Test-Path $ngrokPath) {
    Write-Host "Starting ngrok tunnel on port $Port..." -ForegroundColor Cyan
    Start-Process -FilePath $ngrokPath -ArgumentList "http $Port" -WorkingDirectory (Resolve-Path "$projRoot\..") -NoNewWindow
    Write-Host "ngrok started. Check its console for the public URL." -ForegroundColor Green
} else {
    Write-Host "ngrok.exe not found in project root. To enable a public URL, download ngrok and place ngrok.exe in the project root." -ForegroundColor Yellow
}

Pop-Location

Write-Host "Done. If the server appears to hang in the terminal, open another shell to view logs or ngrok output." -ForegroundColor Cyan
