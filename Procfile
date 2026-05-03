release: python manage.py migrate
release: python manage.py collectstatic --noinput
web: gunicorn mlw.wsgi:application -b 0.0.0.0:$PORT --workers 2
