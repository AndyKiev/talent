# Build stage
FROM node:20-slim AS build

ARG APP_HTTP_PROXY
ARG APP_MODE

ENV HTTP_PROXY=$APP_HTTP_PROXY
ENV HTTPS_PROXY=$APP_HTTP_PROXY

RUN npm config set proxy $HTTP_PROXY && npm config set https-proxy $HTTPS_PROXY

WORKDIR /app

COPY ./frontend/package.json ./package.json
RUN npm install --no-warnings
COPY ./frontend ./

# this will automatically pick the correct .env (development or production)
RUN npm run build -- --mode $APP_MODE
# RUN vite build --mode $APP_MODE
# Serve stage
FROM nginx:alpine

# Copy built React app
COPY --from=build /app/dist /usr/share/nginx/html
# Copy nginx config for frontend
COPY ./frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 4000

CMD [ "nginx", "-g", "daemon off;" ]