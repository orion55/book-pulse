# Critical Error No-Books Message Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Log a critical processing failure and still attempt to send the existing Telegram message that no new books are available.

**Architecture:** Add one focused critical-error handler to `processHelpers.ts`, with injectable side-effect functions so its orchestration can be tested without Telegram or Winston. Load configuration before the main processing `try` in `index.ts`, then delegate critical failures to the new handler.

**Tech Stack:** Node.js 20+, TypeScript 5.9, built-in `node:test`, `tsx`, Telegraf, Winston.

## Global Constraints

- Preserve the existing dated Telegram message «Новых книг пока нет» by calling `sendMessage(null, telegram)`.
- Log the original critical error before attempting the notification.
- If notification delivery fails, log that failure separately.
- Do not change successful book processing or sending behavior.

---

### Task 1: Critical failure orchestration

**Files:**
- Create: `tests/processHelpers.test.ts`
- Modify: `src/services/helpers/processHelpers.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Consumes: `TelegramConfig`, `sendMessage(books, telegramConfig)`, and `toError(err)`.
- Produces: `handleCriticalError(err: unknown, telegram: TelegramConfig, effects?: CriticalErrorEffects): Promise<void>`.

- [ ] **Step 1: Write the failing tests**

Create `tests/processHelpers.test.ts` with two `node:test` cases. The first records calls and asserts that the original `Error` is logged before `send(null, telegram)` is invoked. The second makes `send` reject, then asserts that the original error and a separate notification error are both logged while `handleCriticalError` resolves rather than rethrowing.

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { handleCriticalError } from "../src/services/helpers/processHelpers";
import { TelegramConfig } from "../src/services/config/config.types";

const telegram: TelegramConfig = { bot_token: "token", chat_id: 1 };

test("logs the critical error before sending the no-books message", async () => {
  const calls: string[] = [];
  const failure = new Error("download failed");

  await handleCriticalError(failure, telegram, {
    logError: (error) => calls.push(`log:${error.message}`),
    send: async (books, config) => {
      assert.equal(books, null);
      assert.equal(config, telegram);
      calls.push("send");
    },
  });

  assert.deepEqual(calls, ["log:download failed", "send"]);
});

test("logs a notification failure without replacing the critical error", async () => {
  const logged: Error[] = [];

  await handleCriticalError(new Error("download failed"), telegram, {
    logError: (error) => logged.push(error),
    send: async () => {
      throw new Error("telegram unavailable");
    },
  });

  assert.equal(logged.length, 2);
  assert.equal(logged[0].message, "download failed");
  assert.match(logged[1].message, /telegram unavailable/);
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `npx tsx --test tests/processHelpers.test.ts`

Expected: FAIL because `handleCriticalError` is not exported from `processHelpers.ts`.

- [ ] **Step 3: Implement the minimal handler**

Add the injectable effects type and handler to `src/services/helpers/processHelpers.ts`:

```ts
interface CriticalErrorEffects {
  logError: (error: Error) => void;
  send: typeof sendMessage;
}

const defaultCriticalErrorEffects: CriticalErrorEffects = {
  logError: (error) => logger.error(error),
  send: sendMessage,
};

export const handleCriticalError = async (
  err: unknown,
  telegram: TelegramConfig,
  effects: CriticalErrorEffects = defaultCriticalErrorEffects,
): Promise<void> => {
  effects.logError(toError(err));

  try {
    await effects.send(null, telegram);
  } catch (notificationError: unknown) {
    const error = toError(notificationError);
    effects.logError(
      new Error(`Не удалось отправить сообщение об отсутствии новых книг: ${error.message}`),
    );
  }
};
```

- [ ] **Step 4: Connect the main error path**

In `src/index.ts`, import `handleCriticalError`, load `config` immediately after `printGreeting()` and before the processing `try`, and replace the current catch body with:

```ts
  } catch (err: unknown) {
    await handleCriticalError(err, config.telegram);
  }
```

Keep the existing successful and empty-result branches unchanged.

- [ ] **Step 5: Run focused and project verification**

Run: `npx tsx --test tests/processHelpers.test.ts`

Expected: 2 tests pass.

Run: `npx tsc --noEmit`

Expected: exit code 0 with no diagnostics.

Run: `npm run lint`

Expected: exit code 0 with no ESLint errors.

Run: `git diff --check`

Expected: exit code 0 with no whitespace errors.

- [ ] **Step 6: Commit the implementation**

```powershell
git add -- tests/processHelpers.test.ts src/services/helpers/processHelpers.ts src/index.ts docs/superpowers/plans/2026-07-11-critical-error-no-books-message.md
git commit -m "Исправить уведомление после критической ошибки"
```
