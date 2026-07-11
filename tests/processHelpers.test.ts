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
