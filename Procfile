release: python manage.py migrate --noinput && python manage.py collectstatic --noinput
web: gunicorn mlw.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --worker-class=sync
