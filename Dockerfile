FROM node:20
WORKDIR /app
RUN apt-get update && apt-get install -y sqlite3

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build:linux

ENTRYPOINT ["node", "dist/index.js"]