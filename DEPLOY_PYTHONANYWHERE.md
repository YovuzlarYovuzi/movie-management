PythonAnywhere deploy guide for movie-management

Quick summary
- This project is a Django app. You can deploy to PythonAnywhere by cloning the repo on the PythonAnywhere Bash console, creating a virtualenv, installing requirements, configuring the WSGI file, setting environment variables, and running `migrate` + `collectstatic`.
- If you need Celery (RabbitMQ/Redis) you'll need external managed services for broker/backend (CloudAMQP, Upstash/Redis) and run workers outside PythonAnywhere (paid "always-on" tasks or separate VPS/Fly.io instance).

Steps (recommended)
1) Push your code to a Git host (GitHub, GitLab) so you can `git clone` on PythonAnywhere.

2) On PythonAnywhere -> Consoles -> open a **Bash** console and run:

```bash
# go to your home directory
cd ~
# clone your repo (replace with your repo URL)
git clone https://github.com/YOURUSER/YOURREPO.git
cd YOURREPO
```

3) Create a virtualenv and install dependencies

```bash
# adjust python version if needed (python3.10 etc.)
python3 -m venv --copies .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

4) Configure environment variables
- Option A (recommended): In the PythonAnywhere Web tab, set environment variables in the "Environment variables" section (KEY=VALUE format). Add at least:
  - `SECRET_KEY` (production secret)
  - `DEBUG=False`
  - `DATABASE_URL` (optional; if not set SQLite will be used)
  - `REDIS_URL` (if using Redis)
  - `CELERY_BROKER_URL` and `CELERY_RESULT_BACKEND` if using Celery with external broker
  - `GAME_ENABLED=False` (or as you prefer)

- Option B: export them in the Bash session before running `migrate` (temporary until you restart web app):
```bash
export SECRET_KEY='replace-with-secret'
export DEBUG=False
export DATABASE_URL='postgres://user:pass@HOST:5432/dbname'  # optional
export REDIS_URL='redis://:pw@host:6379/0'  # optional
export CELERY_BROKER_URL='amqp://user:pw@rabbitmqhost/vhost'  # optional
```

5) Configure WSGI
- In the PythonAnywhere Web tab, set the "Source code" path to `/home/YOUR_PYANYWHERE_USERNAME/YOURREPO`.
- Edit the WSGI configuration file from the Web tab (there is an edit link). Replace the example WSGI code with something like:

```python
import os
import sys
project_home = '/home/YOUR_PYANYWHERE_USERNAME/YOURREPO'
if project_home not in sys.path:
    sys.path.insert(0, project_home)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mlw.settings')

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
```

If you are using virtualenv, also add inside WSGI file near the top:
```python
activate_this = '/home/YOUR_PYANYWHERE_USERNAME/YOURREPO/.venv/bin/activate_this.py'
with open(activate_this) as f:
    exec(f.read(), dict(__file__=activate_this))
```

6) Static files & media
- In Web tab -> Static files section, add mapping:
  - URL `/static/` -> `/home/YOUR_PYANYWHERE_USERNAME/YOURREPO/staticfiles`
  - URL `/media/` -> `/home/YOUR_PYANYWHERE_USERNAME/YOURREPO/media`

- Then collect static:
```bash
source .venv/bin/activate
python manage.py collectstatic --noinput
```

7) Database migrations & superuser
```bash
source .venv/bin/activate
python manage.py migrate
python manage.py createsuperuser
```

8) Restart the web app (Web tab -> Reload)

9) Celery notes (important)
- PythonAnywhere does not support long-running background processes on free plans. Options:
  - Use external worker host (small VPS, Fly.io, Render) to run `celery -A mlw worker` using the same `CELERY_BROKER_URL` & `CELERY_RESULT_BACKEND` you configured (CloudAMQP + Upstash Redis).
  - On PythonAnywhere paid plans you can use Always-on Tasks to run a worker, but for reliability it's better to run workers on a separate host.

10) Using Postgres
- PythonAnywhere by default provides MySQL. For Postgres you can:
  - Use an external managed Postgres (ElephantSQL, Heroku Postgres, AWS RDS) and set `DATABASE_URL` to that value in env vars.
  - Or on a paid PythonAnywhere plan you could run your own DB on a VPS and connect to it.

11) Debugging
- Check error logs from Web tab, the error log and server log are helpful.
- If static files 404, re-run `collectstatic` and ensure static mapping is correct.

Automatable helper script (commands to run on PythonAnywhere Bash)

Create file `scripts/deploy-to-pythonanywhere.sh` and run it on the PythonAnywhere Bash console (edit variables at top):

```bash
#!/usr/bin/env bash
set -euo pipefail
# Edit these before running
PROJECT_DIR=$HOME/YOURREPO
VENV_DIR=$PROJECT_DIR/.venv
REPO_URL=https://github.com/YOURUSER/YOURREPO.git

cd $HOME
if [ ! -d "$PROJECT_DIR" ]; then
  git clone $REPO_URL
fi
cd $PROJECT_DIR
python3 -m venv --copies $VENV_DIR
source $VENV_DIR/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
# OPTIONAL: export env vars here or set them in Web tab
# python manage.py migrate
# python manage.py collectstatic --noinput
# echo "Now configure WSGI file, static mappings and environment variables in the Web tab and reload the app."
```

If you want, I can:
- Prepare this script in the repo with placeholders filled from your inputs, or
- Walk you through performing these steps interactively while you have access to PythonAnywhere web console.

Limitations / notes
- I cannot access your PythonAnywhere account from here; you must run the Bash/WSGI steps in your account console. I can generate scripts and exact commands you can paste into the console.
- For Celery/RabbitMQ you must use an external broker (CloudAMQP) and run workers off-PythonAnywhere or use Always-on tasks on paid plans.

---
If you want I will now create `scripts/deploy-to-pythonanywhere.sh` inside the repo with placeholders ready for you to edit. Tell me if I should create it and whether to default to SQLite or ElephantSQL for `DATABASE_URL` in examples.