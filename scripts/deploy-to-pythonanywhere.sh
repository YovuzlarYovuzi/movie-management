#!/usr/bin/env bash
# Helper: run this inside PythonAnywhere Bash to clone, install and run initial setup
# Edit the variables below before running

set -euo pipefail
REPO_URL="${REPO_URL:-}"
# If REPO_URL not provided, attempt to read from local git remote
if [ -z "$REPO_URL" ]; then
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    REPO_URL=$(git config --get remote.origin.url || true)
  fi
fi

if [ -z "$REPO_URL" ]; then
  echo "ERROR: REPO_URL not set and could not detect git remote. Set REPO_URL environment variable or edit this script."
  exit 1
fi

# Default PROJECT_DIR based on repo name
REPO_NAME=$(basename "$REPO_URL" .git)
PROJECT_DIR="${PROJECT_DIR:-$HOME/$REPO_NAME}"
VENV_DIR="$PROJECT_DIR/.venv"

echo "Cloning repository (if needed)..."
if [ ! -d "$PROJECT_DIR" ]; then
  git clone "$REPO_URL" "$PROJECT_DIR"
fi

cd "$PROJECT_DIR"

echo "Creating venv..."
python3 -m venv --copies "$VENV_DIR"
source "$VENV_DIR/bin/activate"

echo "Installing requirements..."
pip install --upgrade pip
pip install -r requirements.txt

echo "Run migrations and collectstatic (ensure env vars are set via Web tab or export them now)"
python manage.py migrate --noinput
python manage.py collectstatic --noinput

echo "Done. Now edit the WSGI file in the Web tab, set static mappings (/static/ and /media/),
set environment variables (SECRET_KEY, DEBUG, DATABASE_URL, REDIS_URL, CELERY_BROKER_URL as needed), and Reload the web app."
