FROM node:20
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build:linux

ENTRYPOINT ["node", "dist/index.js"]