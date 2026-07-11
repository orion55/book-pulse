import assert from "node:assert/strict";
import test from "node:test";
import { parseBooks } from "../src/services/fetchBooks/parseBooks";

test("deduplicates duplicate book links by bookId", () => {
  const html = `
    <h1 class="title">Автор</h1>
    <form method="POST" action="/a/10">
      <a href="/b/42">Первое название</a>
      <a href="/b/42">Повторное название</a>
      <a href="/b/43">Другая книга</a>
    </form>
  `;

  const result = parseBooks(html, "https://flibusta.is/a/10");

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.data.books, [
      { bookId: 42, title: "Первое название" },
      { bookId: 43, title: "Другая книга" },
    ]);
  }
});
