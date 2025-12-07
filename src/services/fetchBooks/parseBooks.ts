import { AuthorLibrary, Book } from "../types/books.types";
import * as cheerio from "cheerio";
import { logger } from "../logger.service";

export type ParseResult =
  | { ok: true; data: AuthorLibrary }
  | { ok: false; errorMessage: string };

export const parseBooks = (html: string, url: string): ParseResult => {
  try {
    const $ = cheerio.load(html);

    const parts = url.split("/");
    const authorId = Number(parts[parts.length - 1]);

    if (!authorId) {
      const msg = `Не удалось определить authorId по URL ${url}`;
      logger.error(msg);
      return { ok: false, errorMessage: msg };
    }

    const authorName = $("h1.title").first().text().trim();
    if (!authorName) {
      const msg = `Не найдено имя автора для ${url}`;
      logger.error(msg);
      return { ok: false, errorMessage: msg };
    }

    const form = $("form[method='POST'][action^='/a/']");
    if (!form.length) {
      const msg = `Не найдена форма для парсинга книг (${url})`;
      logger.error(msg);
      return { ok: false, errorMessage: msg };
    }

    const books: Book[] = [];

    form.find("a[href^='/b/']").each((_, elem) => {
      const href = $(elem).attr("href");
      if (!href) return;

      const match = href.match(/^\/b\/(\d+)\/?$/);
      if (!match) return;

      books.push({
        bookId: Number(match[1]),
        title: $(elem).text().trim(),
      });
    });

    return {
      ok: true,
      data: {
        authorId,
        authorName,
        books,
      },
    };
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : String(err ?? "Unknown error");
    logger.error(`Ошибка парсинга ${url}: ${msg}`);
    return { ok: false, errorMessage: msg };
  }
};
