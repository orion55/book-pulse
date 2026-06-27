FROM node:20-bookworm AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate \
 && npx rimraf dist \
 && npx ncc build src/index.ts -o dist --external .prisma/client \
 && npx cpy .env.production dist --flat \
 && npx move-file dist/.env.production dist/.env \
 && npx cpy dist/client/libquery_engine-debian-openssl-3.0.x.so.node dist --flat \
 && npx rimraf dist/client

FROM node:20-slim  AS runner
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends libssl3 tzdata \
 && ln -fs /usr/share/zoneinfo/Asia/Yekaterinburg /etc/localtime \
 && dpkg-reconfigure -f noninteractive tzdata \
 && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/dist .
ENTRYPOINT ["node", "index.js"]
