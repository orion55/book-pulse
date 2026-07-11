import assert from "node:assert/strict";
import test from "node:test";
import { handleCriticalError } from "../src/services/helpers/processHelpers";
import { TelegramConfig } from "../src/services/config/config.types";

const telegram: TelegramConfig = { bot_token: "token", chat_id: 1 };

test("logs the critical error before sending an error notification", async () => {
  const calls: string[] = [];
  const failure = new Error("download failed");

  await handleCriticalError(failure, telegram, {
    logError: (error) => calls.push(`log:${error.message}`),
    sendError: async (config) => {
      assert.equal(config, telegram);
      calls.push("send-error");
    },
  });

  assert.deepEqual(calls, ["log:download failed", "send-error"]);
});

test("logs a notification failure without replacing the critical error", async () => {
  const logged: Error[] = [];

  await handleCriticalError(new Error("download failed"), telegram, {
    logError: (error) => logged.push(error),
    sendError: async () => {
      throw new Error("telegram unavailable");
    },
  });

  assert.equal(logged.length, 2);
  assert.equal(logged[0].message, "download failed");
  assert.match(logged[1].message, /критической ошибке/);
  assert.match(logged[1].message, /telegram unavailable/);
});
