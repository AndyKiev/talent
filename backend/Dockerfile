FROM python:3.11.9-custom AS python_base
#FROM python:3.11.9-slim AS python_base

ARG APP_HTTP_PROXY

ENV HTTP_PROXY=$APP_HTTP_PROXY
ENV HTTPS_PROXY=$APP_HTTP_PROXY

RUN /bin/sh -c 'echo "Acquire::http::Proxy \"${HTTP_PROXY}\";" > /etc/apt/apt.conf.d/99proxy' && \
    /bin/sh -c 'echo "Acquire::https::Proxy \"${HTTPS_PROXY}\";" >> /etc/apt/apt.conf.d/99proxy'

ENV POETRY_VERSION=2.3.2

RUN pip install poetry==${POETRY_VERSION}

ENV PATH="/root/.local/bin:${PATH}"

WORKDIR /app

RUN apt-get update && apt-get install -y openjdk-17-jdk

ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH="$JAVA_HOME/bin:$PATH"
ENV LD_LIBRARY_PATH="$JAVA_HOME/lib/server:$LD_LIBRARY_PATH"

COPY ./backend/pyproject.toml ./backend/poetry.lock ./backend/

WORKDIR /app/backend
RUN poetry install --no-root --only main
WORKDIR /app

#COPY ./backend ./backend
#
#RUN mkdir -p /app/backend/auth/keys
#
#RUN chmod +x /app/backend/entrypoint.sh /app/backend/generate_keys.sh

COPY ./backend ./backend
COPY ./generate_keys.sh /app/backend/generate_keys.sh

RUN mkdir -p /app/backend/auth/keys

RUN chmod +x /app/backend/entrypoint.sh /app/backend/generate_keys.sh

ENV PYTHONPATH="/app:${PYTHONPATH}"
ENTRYPOINT ["/app/backend/entrypoint.sh"]

EXPOSE 8004