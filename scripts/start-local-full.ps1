# Start full local stack (Postgres + Redis + RabbitMQ + web + worker)
# Usage: .\scripts\start-local-full.ps1

$ErrorActionPreference = 'Stop'

Write-Host "Starting full Docker Compose stack..."
docker compose -f docker-compose.full.yml up -d

Write-Host "Waiting a few seconds for services to initialize..."
Start-Sleep -s 6

# Load env from .env if present
if (Test-Path .env) {
    Write-Host "Loading .env"
    Get-Content .env | ForEach-Object {
        if ($_ -match "^\s*#") { return }
        if ($_ -match "^\s*$") { return }
        $parts = $_ -split "=",2
        if ($parts.Length -eq 2) { Set-Item -Path "Env:$($parts[0])" -Value $parts[1] }
    }
}

# Ensure migrations
Write-Host "Running migrations..."
python manage.py migrate

Write-Host "Collecting static files..."
python manage.py collectstatic --noinput

Write-Host "Starting Django dev server (background)..."
Start-Process -NoNewWindow -FilePath python -ArgumentList 'manage.py','runserver','0.0.0.0:8000'

Write-Host "Starting Celery worker (background)..."
Start-Process -NoNewWindow -FilePath celery -ArgumentList '-A','mlw','worker','--loglevel=info'

Write-Host "All set. Web: http://localhost:8000  RabbitMQ UI: http://localhost:15672  Postgres: localhost:5432"
