import assert from "node:assert/strict";
import test from "node:test";
import { fetchHtmlWithRetry } from "../src/services/fetchBooks/fetchHtmlWithRetry";

test("keeps the timeout active while reading the response body", async () => {
  let resolveBody!: (html: string) => void;
  const body = new Promise<string>((resolve) => {
    resolveBody = resolve;
  });
  let cleared = 0;

  const resultPromise = fetchHtmlWithRetry("https://example.test/a/1", 0, 0, {
    fetch: async () =>
      ({
        ok: true,
        text: () => body,
      }) as Response,
    setTimeout: (() => 7) as unknown as typeof setTimeout,
    clearTimeout: (() => {
      cleared++;
    }) as typeof clearTimeout,
    sleep: async () => undefined,
  });

  await Promise.resolve();
  assert.equal(cleared, 0);

  resolveBody("<html></html>");
  assert.deepEqual(await resultPromise, {
    ok: true,
    html: "<html></html>",
    attempts: 1,
  });
  assert.equal(cleared, 1);
});
