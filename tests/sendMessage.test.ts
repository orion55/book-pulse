import assert from "node:assert/strict";
import test from "node:test";
import { sendMessage } from "../src/services/bookBot/send.message";

const book = {
  authors: ["Автор"],
  title: "Книга",
  annotation: "Аннотация",
  image: "assets/cover.jpg",
  url: "https://example.test/b/1",
};

test("removes a temporary cover when text sending fails", async () => {
  const removed: string[] = [];
  const effects = {
    createBot: () =>
      ({
        telegram: {
          sendPhoto: async () => undefined,
          sendMessage: async () => {
            throw new Error("telegram unavailable");
          },
        },
      }) as never,
    createReadStream: (() => ({ on: () => undefined })) as never,
    hasReadableImage: async () => true,
    removeImage: async (imagePath: string) => {
      removed.push(imagePath);
    },
  };

  await assert.rejects(
    sendMessage(
      [book],
      { bot_token: "token", chat_id: 1 },
      effects,
    ),
    /telegram unavailable/,
  );
  assert.deepEqual(removed, [book.image]);
});
