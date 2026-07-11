import assert from "node:assert/strict";
import test from "node:test";
import {
  dataSync,
  saveSyncedBooks,
} from "../src/services/dataSync/dataSync.service";

test("returns an empty sync plan for an empty books map", async () => {
  const result = await dataSync(new Map());

  assert.deepEqual(result, {
    newBooks: [],
    baselineBooks: [],
    bookIdsToRemove: [],
  });
});

test("commits removals and successful books in one transaction", async () => {
  const calls: string[] = [];
  const transactionBooks = {
    deleteMany: async (args: unknown) => {
      calls.push(`deleteMany:${JSON.stringify(args)}`);
      return {};
    },
    upsert: async (args: unknown) => {
      calls.push(`upsert:${JSON.stringify(args)}`);
      return {};
    },
  };
  const client = {
    books: {
      createMany: async () => {
        calls.push("createMany");
        return {};
      },
    },
    $transaction: async (operation: (tx: unknown) => Promise<void>) => {
      calls.push("transaction");
      await operation({ books: transactionBooks });
    },
    $disconnect: async () => undefined,
  };

  await saveSyncedBooks(
    [{ authorId: 7, bookId: 3, title: "new" }],
    [12, 13],
    client,
  );

  assert.equal(calls[0], "transaction");
  assert.match(calls[1], /deleteMany.*12.*13/);
  assert.match(calls[2], /upsert.*authorId_bookId.*authorId.*7.*bookId.*3/);
  assert.equal(calls.length, 3);
});

test("builds a read-only sync plan for an existing author", async () => {
  const writeCalls: string[] = [];
  const client = {
    books: {
      findMany: async () => [
        { id: 11, authorId: 7, bookId: 1, title: "retained" },
        { id: 12, authorId: 7, bookId: 2, title: "removed" },
      ],
      createMany: async () => {
        writeCalls.push("createMany");
        return {};
      },
      delete: async () => {
        writeCalls.push("delete");
        return {};
      },
    },
    $disconnect: async () => undefined,
  };

  const plan = await dataSync(
    new Map([
      [
        7,
        [
          { bookId: 1, title: "retained" },
          { bookId: 3, title: "new" },
        ],
      ],
    ]),
    client,
  );

  assert.deepEqual(plan, {
    newBooks: [{ authorId: 7, bookId: 3, title: "new" }],
    baselineBooks: [],
    bookIdsToRemove: [12],
  });
  assert.deepEqual(writeCalls, []);
});

test("keeps a new author's catalog as an unpublished baseline", async () => {
  const client = {
    books: {
      findMany: async () => [],
    },
    $disconnect: async () => undefined,
  };

  const plan = await dataSync(
    new Map([[7, [{ bookId: 1, title: "baseline" }]]]),
    client,
  );

  assert.deepEqual(plan, {
    newBooks: [],
    baselineBooks: [{ authorId: 7, bookId: 1, title: "baseline" }],
    bookIdsToRemove: [],
  });
});
