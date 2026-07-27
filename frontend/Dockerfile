# Build stage
FROM node:20-slim AS build

ARG APP_HTTP_PROXY
ARG APP_MODE

ENV HTTP_PROXY=$APP_HTTP_PROXY
ENV HTTPS_PROXY=$APP_HTTP_PROXY

# Only configure the npm proxy when one was supplied; setting it to an empty
# string makes every npm request fail at home.
RUN if [ -n "$APP_HTTP_PROXY" ]; then \
      npm config set proxy "$APP_HTTP_PROXY" && \
      npm config set https-proxy "$APP_HTTP_PROXY"; \
    fi

WORKDIR /app

# paths are relative to the ./frontend build context (see docker-compose.yml)
COPY ./package.json ./package.json
RUN npm install --no-warnings
COPY ./ ./

# this will automatically pick the correct .env (development or production)
RUN npm run build -- --mode $APP_MODE
# RUN vite build --mode $APP_MODE
# Serve stage
FROM nginx:alpine

# Copy built React app
COPY --from=build /app/dist /usr/share/nginx/html
# Copy nginx config for frontend
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 4000

CMD [ "nginx", "-g", "daemon off;" ]