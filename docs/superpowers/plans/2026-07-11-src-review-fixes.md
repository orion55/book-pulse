# Source Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Исправить пять подтверждённых дефектов в сетевой загрузке, синхронизации БД, Telegram-уведомлениях, очистке обложек и дедупликации книг.

**Architecture:** Разделить вычисление плана синхронизации и его транзакционную фиксацию, сохранив частичный успех публикаций. Внешние эффекты HTTP, Telegram и Prisma предоставить через узкие необязательные зависимости, чтобы регрессии проверялись встроенным `node:test` без обращения к сети.

**Tech Stack:** Node.js 20+, TypeScript 5.9, `node:test`, `tsx`, Prisma 6/SQLite, Telegraf 4, Cheerio 1.

## Global Constraints

- Успешно опубликованные книги сохраняются, неуспешные повторяются при следующем запуске.
- Удаления и добавления фиксируются одной Prisma-транзакцией после внешних операций.
- Обычное сообщение «новых книг нет» не используется для критических ошибок.
- Новые runtime-зависимости не добавляются; `tsx` добавляется только в `devDependencies`.
- Последовательная отправка книг сохраняется.

---

### Task 1: Test command and critical-error notification

**Files:**
- Modify: `package.json`
- Create: `src/services/bookBot/send.error.ts`
- Modify: `src/services/helpers/processHelpers.ts`
- Modify: `tests/processHelpers.test.ts`

**Interfaces:**
- Consumes: `TelegramConfig` and Telegraf's `telegram.sendMessage`.
- Produces: `sendErrorMessage(telegramConfig: TelegramConfig): Promise<void>` and an updated `CriticalErrorEffects.sendError` dependency.

- [ ] **Step 1: Add the test runner and write the failing test**

Add `"test": "tsx --test tests/**/*.test.ts"` to `scripts` and `"tsx": "^4.20.3"` to `devDependencies`. Update `tests/processHelpers.test.ts` so the first test injects `sendError` and asserts it receives only `telegram`; retain the notification-failure assertion with the text `Не удалось отправить сообщение о критической ошибке`.

```ts
test("logs the critical error before sending an error notification", async () => {
  const calls: string[] = [];
  await handleCriticalError(new Error("download failed"), telegram, {
    logError: (error) => calls.push(`log:${error.message}`),
    sendError: async (config) => {
      assert.equal(config, telegram);
      calls.push("send-error");
    },
  });
  assert.deepEqual(calls, ["log:download failed", "send-error"]);
});
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- --test-name-pattern="critical error"`

Expected: FAIL because `CriticalErrorEffects` still requires `send` and has no `sendError`.

- [ ] **Step 3: Implement the dedicated notification**

Create `send.error.ts` with token/chat validation matching `send.message.ts`, instantiate `Telegraf`, and send plain text:

```ts
export const sendErrorMessage = async (config: TelegramConfig): Promise<void> => {
  if (!config.bot_token) throw new Error("BOT_TOKEN не задан");
  if (!Number.isFinite(config.chat_id) || config.chat_id === 0) {
    throw new Error("CHAT_ID не задан или некорректен");
  }
  const bot = new Telegraf(config.bot_token);
  await bot.telegram.sendMessage(
    config.chat_id,
    "⚠️ Проверка новых книг завершилась с критической ошибкой. Подробности записаны в журнал.",
  );
};
```

Change `CriticalErrorEffects` to `{ logError; sendError: typeof sendErrorMessage }`, use `sendErrorMessage` by default, and call `effects.sendError(telegram)`.

- [ ] **Step 4: Verify GREEN**

Run: `npm install` then `npm test -- --test-name-pattern="critical error"`

Expected: both critical-error tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add package.json package-lock.json src/services/bookBot/send.error.ts src/services/helpers/processHelpers.ts tests/processHelpers.test.ts
git commit -m "Исправить уведомление о критической ошибке"
```

---

### Task 2: HTTP timeout through response-body reading

**Files:**
- Modify: `src/services/fetchBooks/fetchHtmlWithRetry.ts`
- Create: `tests/fetchHtmlWithRetry.test.ts`

**Interfaces:**
- Produces: exported `FetchRetryDependencies` and optional fourth parameter `dependencies?: Partial<FetchRetryDependencies>`.
- Preserves: `fetchHtmlWithRetry(url, maxRetries?, baseDelayMs?)` production calls.

- [ ] **Step 1: Write failing timer-lifetime tests**

Use a deferred `response.text()` and injected timer functions. Assert that `clearTimeout` has not run while body reading is pending, then resolve the body and assert it runs once. Add a rejection case asserting cleanup after `text()` throws.

```ts
const resultPromise = fetchHtmlWithRetry("https://example.test/a/1", 0, 0, {
  fetch: async () => ({ ok: true, text: () => body }) as Response,
  setTimeout: (() => 7) as typeof setTimeout,
  clearTimeout: (() => cleared++) as typeof clearTimeout,
  sleep: async () => undefined,
});
assert.equal(cleared, 0);
resolveBody("<html></html>");
assert.equal((await resultPromise).ok, true);
assert.equal(cleared, 1);
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- --test-name-pattern="response body"`

Expected: FAIL because the fourth parameter does not exist and the timer is cleared before body resolution.

- [ ] **Step 3: Implement minimal dependency injection and `finally` cleanup**

Merge dependencies with global defaults. For each attempt create the controller and timer before `try`, read `await response.text()` inside `try`, and call `clearTimeout(timer)` only in `finally`. Use injected `sleep` for backoff.

```ts
const timer = deps.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
try {
  const response = await deps.fetch(url + FILTER, { signal: controller.signal });
  if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
  const html = await response.text();
  return { ok: true, html, attempts: attempt };
} catch (err) {
  // existing retry handling
} finally {
  deps.clearTimeout(timer);
}
```

- [ ] **Step 4: Verify GREEN and commit**

Run: `npm test -- --test-name-pattern="response body"`

Expected: both timeout-lifetime tests PASS.

```powershell
git add src/services/fetchBooks/fetchHtmlWithRetry.ts tests/fetchHtmlWithRetry.test.ts
git commit -m "Исправить таймаут загрузки HTML"
```

---

### Task 3: Book deduplication and database uniqueness

**Files:**
- Modify: `src/services/fetchBooks/parseBooks.ts`
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260711170000_add_books_unique_author_book/migration.sql`
- Create: `tests/parseBooks.test.ts`

**Interfaces:**
- Preserves: `parseBooks(html, url): ParseResult`.
- Produces: unique `books` entries by `bookId` and Prisma compound key `authorId_bookId`.

- [ ] **Step 1: Write the failing parser test**

Build minimal HTML containing two `/b/42` anchors and one `/b/43` anchor inside the expected form. Assert `[42, 43]` and that book 42 retains the first title.

```ts
const result = parseBooks(html, "https://flibusta.is/a/10");
assert.equal(result.ok, true);
if (result.ok) {
  assert.deepEqual(result.data.books, [
    { bookId: 42, title: "Первое название" },
    { bookId: 43, title: "Другая книга" },
  ]);
}
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- --test-name-pattern="duplicate book links"`

Expected: FAIL with three parsed books instead of two.

- [ ] **Step 3: Deduplicate during parsing**

Add `const seenBookIds = new Set<number>()`; after parsing a numeric `bookId`, return from the callback when already present, otherwise add it before pushing the book.

- [ ] **Step 4: Verify parser GREEN**

Run: `npm test -- --test-name-pattern="duplicate book links"`

Expected: PASS.

- [ ] **Step 5: Add the unique schema and safe migration**

Add `@@unique([authorId, bookId])` to `Books`. Create the migration:

```sql
DELETE FROM "Books"
WHERE "id" NOT IN (
  SELECT MIN("id") FROM "Books" GROUP BY "authorId", "bookId"
);

CREATE UNIQUE INDEX "Books_authorId_bookId_key"
ON "Books"("authorId", "bookId");
```

Run: `npm run generate-clients`

Expected: Prisma Client generation succeeds and exposes `authorId_bookId`.

- [ ] **Step 6: Commit**

```powershell
git add src/services/fetchBooks/parseBooks.ts tests/parseBooks.test.ts prisma/schema.prisma prisma/migrations/20260711170000_add_books_unique_author_book/migration.sql
git commit -m "Запретить дубликаты книг"
```

---

### Task 4: Read-only sync planning and transactional commit

**Files:**
- Modify: `src/services/types/books.types.ts`
- Modify: `src/services/dataSync/dataSync.service.ts`
- Modify: `src/index.ts`
- Create: `tests/dataSync.test.ts`

**Interfaces:**
- Produces: `SyncPlan = { newBooks: BookWithAuthor[]; baselineBooks: BookWithAuthor[]; bookIdsToRemove: number[] }`.
- Produces: `dataSync(books, client?): Promise<SyncPlan>` with a narrow injectable client.
- Produces: `saveSyncedBooks(books, bookIdsToRemove, client?): Promise<void>`.

- [ ] **Step 1: Write failing planning tests**

Inject a fake Prisma-shaped client whose `findMany` returns one retained and one removed row. Assert `dataSync` returns the new book and removed primary key and never calls `delete`, `createMany`, `upsert`, or `$transaction`. Add a baseline-author case asserting existing behavior stores the fetched catalog as baseline via the returned commit plan rather than writing during planning.

```ts
assert.deepEqual(plan, {
  newBooks: [{ authorId: 7, bookId: 3, title: "new" }],
  baselineBooks: [],
  bookIdsToRemove: [12],
});
assert.deepEqual(writeCalls, []);
```

- [ ] **Step 2: Verify planning RED**

Run: `npm test -- --test-name-pattern="sync plan"`

Expected: FAIL because `dataSync` deletes rows and returns an array/null.

- [ ] **Step 3: Implement `SyncPlan` and read-only planning**

Return empty arrays instead of `null`. For authors absent from the DB, put their
fetched books in `baselineBooks` to preserve the current bootstrap behavior:
they are recorded without Telegram publication. For existing authors, populate
`newBooks` and `bookIdsToRemove` without writes.

- [ ] **Step 4: Write failing transaction test**

Inject a fake client with `$transaction(callback)` and record calls. Pass one successful book and two removal IDs. Assert exactly one transaction, one `deleteMany({ where: { id: { in: [...] } } })`, and one `upsert` using `authorId_bookId`.

```ts
await saveSyncedBooks(successful, [12, 13], client);
assert.equal(transactionCalls, 1);
assert.deepEqual(upsertWhere, {
  authorId_bookId: { authorId: 7, bookId: 3 },
});
```

- [ ] **Step 5: Verify transaction RED, then implement GREEN**

Run: `npm test -- --test-name-pattern="transactional sync commit"`

Expected: FAIL because the current function only calls `createMany`.

Implement one interactive `$transaction`; call `deleteMany` when removal IDs exist and `upsert` for each successful or baseline book. Disconnect only clients created inside the service, never injected clients.

- [ ] **Step 6: Update main orchestration**

Destructure the plan. When no `newBooks` exist, commit removals and baseline books before `sendMessage(null, ...)`. Otherwise collect successful books as today, then commit successful, baseline and removed records together. A failed `processBook` is omitted from the commit.

- [ ] **Step 7: Verify GREEN and commit**

Run: `npm test -- --test-name-pattern="sync plan|transactional sync commit"`

Expected: all sync tests PASS.

```powershell
git add src/services/types/books.types.ts src/services/dataSync/dataSync.service.ts src/index.ts tests/dataSync.test.ts
git commit -m "Сделать фиксацию синхронизации транзакционной"
```

---

### Task 5: Guaranteed temporary-cover cleanup

**Files:**
- Modify: `src/services/bookBot/send.message.ts`
- Create: `tests/sendMessage.test.ts`

**Interfaces:**
- Add optional internal `SendMessageEffects` with `createBot`, `hasReadableImage`, `createReadStream`, `removeImage`, and logging defaults.
- Preserve public two-argument calls to `sendMessage`.

- [ ] **Step 1: Write failing cleanup tests**

Inject a fake bot and readable image. One test makes both Telegram calls succeed; another makes text sending reject after photo sending. In both cases assert `removeImage` receives the image path exactly once. Assert the rejection remains observable in the failure case.

```ts
await assert.rejects(
  sendMessage([book], telegram, effectsWithFailingText),
  /telegram unavailable/,
);
assert.deepEqual(removed, [book.image]);
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- --test-name-pattern="temporary cover"`

Expected: FAIL because dependencies cannot be injected and failed sends skip removal.

- [ ] **Step 3: Implement `finally` cleanup**

Calculate `shouldSendPhoto` before the send attempt. Keep existing photo/text order and rethrow behavior. Move `removeImage(book.image)` to `finally`, guarded by `shouldSendPhoto`; do not call it from the successful branch.

```ts
let shouldSendPhoto = false;
try {
  shouldSendPhoto = await effects.hasReadableImage(book.image);
  // existing photo and text sends
} catch (error) {
  effects.logError("Ошибка при отправке книги:", error);
  throw error;
} finally {
  if (shouldSendPhoto) await effects.removeImage(book.image);
}
```

- [ ] **Step 4: Verify GREEN and commit**

Run: `npm test -- --test-name-pattern="temporary cover"`

Expected: both cleanup tests PASS.

```powershell
git add src/services/bookBot/send.message.ts tests/sendMessage.test.ts
git commit -m "Гарантировать очистку временных обложек"
```

---

### Task 6: Full verification

**Files:**
- Verify all modified files.

**Interfaces:**
- Consumes all outputs from Tasks 1–5.
- Produces a verified implementation with no uncommitted formatting fixes.

- [ ] **Step 1: Run the complete regression suite**

Run: `npm test`

Expected: every test passes, zero failures.

- [ ] **Step 2: Regenerate and type-check**

Run: `npm run generate-clients`

Expected: Prisma Client generation succeeds.

Run: `npx tsc --noEmit`

Expected: exit code 0 with no diagnostics.

- [ ] **Step 3: Run lint and whitespace verification**

Run: `npm run lint`

Expected: exit code 0 with no ESLint errors.

Run: `git diff --check HEAD~5`

Expected: exit code 0 with no whitespace errors.

- [ ] **Step 4: Inspect final scope**

Run: `git status --short` and `git diff --stat HEAD~5`.

Expected: only the planned source, Prisma, test, package, and documentation files are changed; no secrets, runtime database, logs, or downloaded assets are included.
