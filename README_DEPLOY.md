Deployment & performance checklist (quick)

1) Static assets
- Run `python manage.py collectstatic` and serve via a CDN (Cloudflare free) in front of your app.
- Use `whitenoise` (already configured) for compressed static in the container.
- Optimize images (use WebP or compressed PNG/JPEG). Use responsive sizes.

2) HTTP compression and caching
- `GZipMiddleware` enabled in `settings.py` for gzip responses.
- Use long Cache-Control headers for static files; WhiteNoise will version files when `STATICFILES_STORAGE` is used.

3) Concurrency and ASGI
- Use an ASGI server (uvicorn) or Gunicorn+Uvicorn worker for concurrency (Procfile/Dockerfile provided).
- Configure 2-4 workers depending on memory; Fly.io offers free allowance with small VMs.

4) Cache & session store
- Use Redis for caching and session store; consider Upstash Redis free tier or free Redis on Fly.io.
	- Local testing: run `docker run -p 6379:6379 redis:7` and set `REDIS_URL=redis://127.0.0.1:6379/0` in your `.env`.
	- Upstash: copy the provided REST/redis URL into `REDIS_URL` env var (e.g. `rediss://:password@us1-upstash.io:6380/0` or `redis://...`).

5) Database
- Prefer PostgreSQL for production; consider ElephantSQL free tier or managed DB on platform.

6) Free deployment options
- Fly.io: supports Docker deploys, has free allowance; good for small Django apps.
- Render / Railway: may have free credits / tiers (check current offerings).
- Use Cloudflare in front (DNS + CDN) to cache static files and protect against spikes.

Quick Fly.io deploy (example)
- Install `flyctl` and login: `flyctl auth login`
- `flyctl launch` (choose docker, app name)
- `flyctl deploy`

Notes
- Free tiers have limits (sleeping apps, low RAM, monthly hours). For production traffic, consider a paid tier.
- I can add automated image optimization, WebP conversion, and a small CI pipeline if you want.

Full local stack (recommended)
- A full compose file `docker-compose.full.yml` is provided for testing with Postgres, Redis, RabbitMQ, web, and Celery worker. Use `.env` (copy from `.env.example`) to provide values.

PowerShell quick start (Windows)

```powershell
# from project root
docker compose -f docker-compose.full.yml up -d
.\scripts\start-local-full.ps1
```

Notes
- The start script will run migrations, collect static files, start Django dev server and a Celery worker (in background). `docker` must be installed locally.
- For production, set environment variables (`DATABASE_URL`, `REDIS_URL`, `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`, `SECRET_KEY`) in your host or CI/CD secrets (Fly/GitHub Actions). See `fly.toml` example for placeholders.

Postgres / ElephantSQL
- For production use Postgres. ElephantSQL offers a free tier suitable for small projects.
- Create an instance on ElephantSQL and copy the `DATABASE_URL` provided (something like
	`postgres://user:password@host:5432/dbname`) into your deployment environment as `DATABASE_URL`.

CI with GitHub Actions
- A sample CI workflow is included at `.github/workflows/ci.yml`. It runs migrations and tests using
	Postgres + Redis services. To enable CI, push the workflow to your repository — GitHub Actions will run on each PR and push.

Fly.io deploy
- A sample deploy workflow is included at `.github/workflows/deploy-fly.yml`. To use it you'll need:
	- `FLY_API_TOKEN` set in GitHub repository secrets
	- a `fly.toml` in the project root (create with `flyctl launch` locally)

SSH deploy (GitHub Actions)
- A generic SSH deploy workflow is included at `.github/workflows/deploy-ssh.yml`.
- Configure these GitHub Actions Secrets in your repository settings (Settings → Secrets → Actions):
	- `SSH_PRIVATE_KEY` (your private key, without passphrase preferred for automation)
	- `SSH_HOST` (e.g. `example.com`)
	- `SSH_USER` (e.g. `deploy`)
	- `SSH_PATH` (remote path, e.g. `/var/www/movie-management`)

Example: set `SSH_HOST=your.server.com`, `SSH_USER=deploy`, `SSH_PATH=/var/www/movie-management`.
The workflow will `rsync` the repo to the server and run `migrate` + `collectstatic` and attempt to restart `gunicorn` (adjust as needed).

Running migrations on production (example):

```bash
# Set DATABASE_URL in your environment to the production Postgres URL
python manage.py migrate
python manage.py collectstatic --noinput
```

RabbitMQ (local testing)
- Use RabbitMQ as a Celery broker by setting `CELERY_BROKER_URL` to an AMQP URI (e.g. `amqp://user:pass@rabbitmq:5672//`).
- For quick local testing we provide `docker-compose.rabbitmq.yml` which brings up RabbitMQ (management UI on `:15672`) and Redis.

Example quick start (from project root):

```bash
docker compose -f docker-compose.rabbitmq.yml up -d
# then in another shell, set env and start Django + worker
export CELERY_BROKER_URL=amqp://guest:guest@localhost:5672//
export REDIS_URL=redis://127.0.0.1:6379/0
python manage.py migrate
python manage.py runserver
# start a worker in another shell
celery -A mlw worker --loglevel=info
```

Notes:
- In production you will typically use a managed RabbitMQ service (CloudAMQP, CloudAMQP on Heroku, or a VM with RabbitMQ installed). Set `CELERY_BROKER_URL` accordingly.
- If you prefer to keep Redis as broker/result backend, set `CELERY_BROKER_URL` to your Redis URL (e.g. `redis://...`).
