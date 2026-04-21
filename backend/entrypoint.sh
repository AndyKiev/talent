#!/bin/bash
set -e

echo "Generating JWT keys..."
bash /app/backend/generate_keys.sh

cd /app

if [ "$1" = "celery-worker" ]; then
  exec poetry run celery -A backend.celery.celery_app worker --loglevel=info -E
elif [ "$1" = "celery-beat" ]; then
  exec poetry run celery -A backend.celery.celery_app beat --loglevel=info
elif [ "$1" = "flower" ]; then
  exec poetry run celery -A backend.celery.celery_app flower --broker=redis://redis:6379/0 --port=5555
else
  # SSL is optional: only add flags when both cert files are provided via env
  SSL_ARGS=""
  if [ -n "$APP_SSL_KEYFILE" ] && [ -n "$APP_SSL_CERTFILE" ]; then
    SSL_ARGS="--ssl-keyfile $APP_SSL_KEYFILE --ssl-certfile $APP_SSL_CERTFILE"
    echo "SSL enabled: $APP_SSL_CERTFILE"
  else
    echo "SSL not configured — starting in plain HTTP mode"
  fi

  exec poetry run uvicorn backend.main:app \
    --host "$APP_CONFIG__RUN__HOST" \
    --port "$APP_CONFIG__RUN__PORT" \
    $SSL_ARGS
fi


# #!/bin/bash
# set -e

# echo "Generating JWT keys..."
# bash /app/backend/generate_keys.sh

# cd /app

# #echo "Starting FastAPI application..."
# #exec poetry run uvicorn backend.main:app --host "$APP_CONFIG__RUN__HOST" --port "$APP_CONFIG__RUN__PORT"

# if [ "$1" = "celery-worker" ]; then
#   exec poetry run celery -A backend.celery.celery_app worker --loglevel=info -E
# elif [ "$1" = "celery-beat" ]; then
#   exec poetry run celery -A backend.celery.celery_app beat --loglevel=info
# elif [ "$1" = "flower" ]; then
#   exec poetry run celery -A backend.celery.celery_app flower --broker=redis://redis:6379/0 --port=5555
# else
#   exec poetry run uvicorn backend.main:app --host "$APP_CONFIG__RUN__HOST" --port "$APP_CONFIG__RUN__PORT"\
#    --ssl-keyfile "$APP_SSL_KEYFILE" --ssl-certfile "$APP_SSL_CERTFILE"
# fi

