# syntax=docker/dockerfile:1

FROM node:20-bookworm AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

ENV DATABASE_URL=file:./dev.db

RUN npx prisma generate \
 && npx rimraf dist \
 && npx ncc build src/index.ts -o dist --external .prisma/client \
 && npx cpy dist/client/libquery_engine-debian-openssl-3.0.x.so.node dist --flat \
 && npx rimraf dist/client

FROM node:20-bookworm-slim AS runner

ENV NODE_ENV=production \
    DATABASE_URL=file:./dev.db \
    TZ=Asia/Yekaterinburg

WORKDIR /app

RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime \
 && echo $TZ > /etc/timezone \
 && apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends libssl3 tzdata \
 && ln -snf /usr/share/zoneinfo/$TZ /etc/localtime \
 && echo $TZ > /etc/timezone \
 && rm -rf /var/lib/apt/lists/* \
 && mkdir -p /app/logs /app/assets \
 && chown -R node:node /app

COPY --from=builder --chown=node:node /app/dist ./

USER node
CMD ["node", "index.js"]
