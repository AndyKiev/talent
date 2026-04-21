FROM python:3.12.4-slim

# System deps: openssl for key generation, build tools for psycopg2/ldap3
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    gcc \
    libpq-dev \
    libldap2-dev \
    libsasl2-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN pip install --no-cache-dir poetry==2.3.3

WORKDIR /app

# Copy dependency files first (layer cache)
COPY pyproject.toml poetry.lock* ./

# Install deps without creating a virtualenv (we're already in a container)
RUN poetry config virtualenvs.create false \
    && poetry install --only main --no-interaction --no-ansi

# Copy the rest of the project
COPY . .

# Copy entrypoint scripts and make them executable
COPY entrypoint.sh /entrypoint.sh
COPY backend/generate_keys.sh /app/backend/generate_keys.sh
RUN chmod +x /entrypoint.sh /app/backend/generate_keys.sh

EXPOSE 8002

ENTRYPOINT ["/entrypoint.sh"]

# FROM python:3.11.9-custom AS python_base

# ARG APP_HTTP_PROXY

# ENV HTTP_PROXY=$APP_HTTP_PROXY
# ENV HTTPS_PROXY=$APP_HTTP_PROXY

# RUN /bin/sh -c 'echo "Acquire::http::Proxy \"${HTTP_PROXY}\";" > /etc/apt/apt.conf.d/99proxy' && \
#     /bin/sh -c 'echo "Acquire::https::Proxy \"${HTTPS_PROXY}\";" >> /etc/apt/apt.conf.d/99proxy'

# ENV POETRY_VERSION=2.3.3

# RUN pip install poetry==${POETRY_VERSION}

# ENV PATH="/root/.local/bin:${PATH}"

# WORKDIR /app

# RUN apt-get update && apt-get install -y openjdk-17-jdk

# ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
# ENV PATH="$JAVA_HOME/bin:$PATH"
# ENV LD_LIBRARY_PATH="$JAVA_HOME/lib/server:$LD_LIBRARY_PATH"

# #./poetry.lock
# COPY ./pyproject.toml ./

# RUN poetry install --no-root --only main

# COPY ./backend ./backend

# # Create keys directory and set permissions
# RUN mkdir -p /app/backend/auth/keys

# # Make scripts executable
# RUN chmod +x /app/backend/entrypoint.sh /app/backend/generate_keys.sh

# ENTRYPOINT ["/app/backend/entrypoint.sh"]

# EXPOSE 8002