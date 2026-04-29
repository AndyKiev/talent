FROM node:22-slim

WORKDIR /app

# Copy package files first (layer cache)
COPY package.json package-lock.json ./

RUN npm ci

# Copy the rest of the frontend source
COPY . .

EXPOSE 4002

CMD ["npm", "run", "dev"]