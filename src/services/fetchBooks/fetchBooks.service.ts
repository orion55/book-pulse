import { BooksMap, FailedUrl, FetchBooksResult } from "../types/books.types";
import { fetchHtmlWithRetry } from "./fetchHtmlWithRetry";
import { parseBooks } from "./parseBooks";
import { logger } from "../logger.service";
import colors from "ansi-colors";

// Обрабатываем одну ссылку
const processUrl = async (url: string) => {
  const download = await fetchHtmlWithRetry(url);

  if (!download.ok) {
    return {
      ok: false as const,
      failed: {
        url,
        attempts: download.attempts,
        reason: download.errorMessage,
      },
    };
  }

  const parsed = parseBooks(download.html, url);

  if (!parsed.ok) {
    return {
      ok: false as const,
      failed: {
        url,
        attempts: download.attempts,
        reason: parsed.errorMessage,
      },
    };
  }

  const { authorId, authorName, books } = parsed.data;

  logger.info(
    `Готово: автор «${colors.green(authorName)}», книг: ${colors.green(
      String(books.length),
    )}, попыток: ${colors.green(String(download.attempts))}`,
  );

  return {
    ok: true as const,
    data: { authorId, books },
  };
};

// Основная функция
export const fetchBooks = async (urls: string[]): Promise<FetchBooksResult> => {
  const booksMap: BooksMap = new Map();
  const failed: FailedUrl[] = [];

  const concurrency = 10;
  let index = 0;

  while (index < urls.length) {
    const chunk = urls.slice(index, index + concurrency);

    const results = await Promise.allSettled(
      chunk.map((url) => processUrl(url)),
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        const processed = result.value; // читаемое имя

        if (!processed.ok) {
          failed.push(processed.failed);
          continue;
        }

        booksMap.set(processed.data.authorId, processed.data.books);
      } else {
        failed.push({
          url: "unknown",
          attempts: 0,
          reason: String(result.reason),
        });
      }
    }

    index += concurrency;
  }

  if (failed.length > 0) {
    logger.warn(
      "\n===== FAILED URLS =====\n" +
        failed
          .map(
            (fail) =>
              `URL: ${fail.url}\n  Попыток: ${fail.attempts}\n  Причина: ${fail.reason}\n`,
          )
          .join("\n") +
        "========================\n",
    );
  } else {
    logger.info("Все ссылки успешно обработаны, ошибок нет.");
  }

  return { booksMap, failed };
};
