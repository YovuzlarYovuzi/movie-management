$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$pythonExe = Join-Path $repoRoot ".venv\Scripts\python.exe"
$managePy = Join-Path $repoRoot "manage.py"

if (-not (Test-Path $pythonExe)) {
  Write-Host "Virtualenv topilmadi: $pythonExe"
  Write-Host "Avval venv yarating: py -m venv .venv (yoki python -m venv .venv)"
  exit 1
}

if (-not (Test-Path $managePy)) {
  Write-Host "manage.py topilmadi: $managePy"
  exit 1
}

if ($args.Count -eq 0) {
  & $pythonExe $managePy runserver 127.0.0.1:8000
} else {
  & $pythonExe $managePy runserver @args
}

exit $LASTEXITCODE

