# Repository Guidelines

## Project Structure & Module Organization

Book Pulse is a Node.js TypeScript service for tracking new books, downloading them, and publishing updates to Telegram. Application code lives in `src/`, with entry point `src/index.ts`. Feature services are under `src/services/`, including `fetchBooks/`, `getBooks/`, `dataSync/`, `bookBot/`, and `config/`. Shared types are in `src/services/types/`; helpers are in `src/services/helpers/`.

Prisma schema and migrations are in `prisma/`. Docker build output is produced in `dist/` during image creation and should not be edited. Runtime mounts live under `docker/`: `dev.db`, `config.yml`, and `logs/`.

## Build, Test, and Development Commands

- `npm install`: install dependencies.
- `npm run dev`: run `src/index.ts` with `tsx`.
- `npm run generate-clients`: generate the Prisma client.
- `npm run lint`: lint JavaScript and TypeScript files with ESLint.
- `npm run format`: format project files with Prettier.
- `npm run docker`: run `docker compose down --remove-orphans`, then rebuild and recreate the service.
- `npx tsc --noEmit`: type-check without build output.

Docker assembly is handled in `Dockerfile`: Prisma generation, `dist/` cleanup, NCC bundling, `.env.production` copying, and Linux Prisma query engine placement.

## Codex Agents

Project-scoped Codex custom agents live in `.codex/agents/`. The `code-reviewer` agent is defined in `.codex/agents/code-reviewer.toml`; invoke it explicitly when a focused review is useful, for example: "Spawn the code-reviewer agent to review the current changes."

The legacy `.agents/` directory is not loaded by Codex. Keep working Codex agent definitions under `.codex/agents/`.

## MCP Usage

Use the MCP servers already configured in the active Codex environment when they provide fresher or more authoritative context than the local repository. Do not add or reconfigure MCP servers for this project unless the user asks for that explicitly.

The currently configured documentation MCP server is `context7`. Use Context7 for current documentation whenever a task depends on library, framework, SDK, API, CLI, or cloud-service behavior, including syntax, configuration, migrations, version-specific behavior, and dependency-specific debugging. Start by resolving the library ID, select the best match, then query the docs with the user's actual question.

Prefer local repository files for project-specific code, configuration, scripts, and business logic. Do not use MCP for routine refactoring, writing simple scripts from scratch, code review of local changes, or general programming concepts unless external current documentation is material to the answer.

If a relevant MCP server is unavailable or does not return useful context, continue with local analysis and mention the unchecked external context when it affects confidence.

## Coding Style & Naming Conventions

Use TypeScript targeting ES2020 and CommonJS. Keep `strict` compatibility in mind, even though `noImplicitAny` is disabled. Follow names such as `fetchBooks.service.ts`, `downloadBook.ts`, and `config.types.ts`.

Use 2-space indentation for JSON and keep TypeScript formatting consistent with nearby code. Prefer small helpers, clear module boundaries, and typed interfaces for shared data.

## Testing Guidelines

No test runner or test scripts are configured. When adding tests, include the framework setup in `package.json`, document the command here, and place tests near the code or in `tests/`. Use names such as `fetchBooks.service.test.ts`.

Until tests exist, validate with `npx tsc --noEmit`, `npm run lint`, `npm run generate-clients` after Prisma edits, and focused `npm run dev` or Docker runs. Use `npm run format` before committing formatting-sensitive changes.

## Commit & Pull Request Guidelines

Recent commits use short descriptive messages, often in Russian, sometimes with issue references such as `#07`. Keep commits concise and action-oriented, for example `Fix docker-compose config #08`.

Pull requests should include a summary, linked issues when applicable, configuration or migration notes, and local verification steps. Include screenshots or logs only when useful.

## Security & Configuration Tips

Do not commit secrets from `.env` or `.env.production`. Treat Telegram tokens, chat IDs, database URLs, and downloaded book data as sensitive. Review Prisma migrations before database resets, and keep mounted files in `docker/` environment-specific.
