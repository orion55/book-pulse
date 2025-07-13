FROM node:20-bookworm AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build:linux

FROM node:20-slim  AS runner
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends libssl3 \
 && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/dist .
ENTRYPOINT ["node", "index.js"]
