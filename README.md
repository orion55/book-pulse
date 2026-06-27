# Book Pulse

Book Pulse - Node.js/TypeScript-сервис для отслеживания новых книг на Flibusta и публикации обновлений в Telegram.

Приложение выполняет один проход: читает список авторских страниц из `config.yml`, загружает и парсит их, синхронизирует состояние с SQLite через Prisma, скачивает данные новых книг и отправляет сообщения в Telegram.

## Возможности

- Читает настройки Telegram и список авторов из YAML-конфига.
- Загружает страницы авторов параллельно, с таймаутом и повторными попытками.
- Парсит книги автора и хранит текущее состояние в SQLite.
- На первом запуске для нового автора создает базовую запись в базе без публикации уже существующих книг.
- При следующих запусках определяет новые и удаленные книги.
- Для новых книг получает страницу книги, авторов, аннотацию, обложку и ссылку.
- Отправляет обложку и Markdown-сообщение в Telegram-чат.
- Если новых книг нет, отправляет отдельное сообщение "Новых книг пока нет".
- Пишет логи в консоль и файл `book-pulse.log` в рабочей папке логов.

## Структура проекта

- `src/index.ts` - точка входа.
- `src/services/fetchBooks/` - загрузка и парсинг страниц авторов.
- `src/services/dataSync/` - синхронизация книг с базой.
- `src/services/getBooks/` - получение данных новых книг и обложек.
- `src/services/bookBot/` - отправка сообщений и ошибок в Telegram.
- `src/services/config/` - чтение `config.yml`.
- `prisma/schema.prisma` - схема SQLite.
- `docker-compose.yml` и `Dockerfile` - Docker-запуск.
- `docker/` - runtime-файлы для контейнера: `dev.db`, `config.yml`, `logs/`.

## Требования

- Node.js `>=20.0.0`.
- npm.
- Docker и Docker Compose, если нужен запуск в контейнере.
- Telegram bot token и chat ID.
- SQLite база, доступная через `DATABASE_URL`.

## Конфигурация

Для локального запуска приложение ожидает `src/config.yml`, потому что при `NODE_ENV=development` рабочие файлы берутся из `src/`.

Для Docker-запуска используется `docker/config.yml`, который монтируется в контейнер как `/app/config.yml`.

По той же логике локальные логи и временные обложки попадают в `src/logs/` и `src/assets/`, а в Docker/production - в `/app/logs/` и `/app/assets/`.

Пример `config.yml`:

```yml
telegram:
  bot_token: "123456:telegram-token"
  chat_id: 123456789

books:
  - "http://flibusta.is/a/12345"
  - "http://flibusta.is/a/67890"
```

`books` может быть массивом ссылок или одной строкой. Идентификатор автора берется из последнего сегмента URL.

Для локального запуска нужен `.env`:

```env
NODE_ENV=development
DATABASE_URL=file:./dev.db
```

Для Docker-запуска `NODE_ENV`, `DATABASE_URL` и `TZ` заданы в `docker-compose.yml`; `.env.production` в образ не копируется.

При ручном запуске production-бандла вне Compose используйте:

```env
NODE_ENV=production
DATABASE_URL=file:./dev.db
```

Секреты, базы, логи и локальные конфиги исключены из git.

## Команды

Установить зависимости:

```bash
npm install
```

Сгенерировать Prisma Client:

```bash
npm run generate-clients
```

Запустить локально:

```bash
npm run dev
```

Запустить через Docker Compose:

```bash
npm run docker
```

В `package.json` сейчас нет отдельных скриптов `build` и `start`. Production-бандл собирается внутри `Dockerfile` через Prisma generate, очистку `dist` и `ncc build`.

## Docker

Контейнер собирается из `node:20-bookworm`, затем запускается на `node:20-bookworm-slim` от пользователя `node`.

Во время сборки:

- генерируется Prisma Client;
- очищается `dist/`;
- `src/index.ts` упаковывается через `ncc`;
- Linux Prisma query engine переносится в итоговый bundle.

Build context фильтруется через `.dockerignore`, поэтому в образ не попадают `node_modules`, `.git`, `.env*`, локальные базы, логи и runtime-конфиги.

Runtime-монтажи из `docker-compose.yml`:

- `./docker/dev.db:/app/dev.db`
- `./docker/config.yml:/app/config.yml`
- `./docker/logs:/app/logs`

## Проверка

В проекте пока нет настроенного test runner. Для проверки используйте:

```bash
npx tsc --noEmit
npx eslint .
```

После изменений Prisma-схемы выполните:

```bash
npm run generate-clients
```
