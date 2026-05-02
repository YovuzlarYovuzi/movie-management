import os

from celery import Celery

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mlw.settings')

from django.conf import settings

# Create Celery app. Prefer broker URL from Django settings (CELERY_BROKER_URL).
# This makes switching between Redis and RabbitMQ simple via environment vars.
broker = getattr(settings, 'CELERY_BROKER_URL', os.environ.get('CELERY_BROKER_URL'))
app = Celery('mlw', broker=broker)

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
# - namespace='CELERY' means all celery-related configuration keys
#   should have a `CELERY_` prefix.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print('celery is working!')
    
# If a result backend is configured in settings, set it on app.conf so
# tasks that expect results can use it. Default was already configured in
# settings via `CELERY_RESULT_BACKEND`.
try:
    result_backend = getattr(settings, 'CELERY_RESULT_BACKEND', None)
    if result_backend:
        app.conf.result_backend = result_backend
except Exception:
    # Keep debug-friendly: don't crash on import if settings are partial
    pass