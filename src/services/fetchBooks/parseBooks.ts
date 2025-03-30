import { AuthorLibrary, Book } from "../types/books.types";
import * as cheerio from "cheerio";
import { logger } from "../logger.service";
import colors from "ansi-colors";

const FILTER = "?lang=__&order=a&hg1=1&hg=1&sa1=1&hr1=1&rd1=1";

export const parseBooks = async (url: string): Promise<AuthorLibrary> => {
  const parts = url.split("/");
  const authorId = Number(parts[parts.length - 1]);
  logger.info(`Загружаем ${url}`);

  const $ = await cheerio.fromURL(url + FILTER);
  if (!$ || !$("body").length) {
    throw new Error("Не удалось загрузить страницу по указанному URL.");
  }

  const authorName = $("h1.title").first().text().trim();
  if (!authorName) {
    throw new Error("Не удалось извлечь имя автора.");
  }

  logger.info(`Парсим «${colors.green(authorName)}»`);

  const form = $("form[method='POST'][action^='/a/']");
  if (!form.length) {
    throw new Error("Не удалось найти форму для парсинга");
  }

  const books: Book[] = [];

  form.find("a[href^='/b/']").each((_, elem) => {
    const href = $(elem).attr("href");
    if (!href) return;
    const match = href.match(/^\/b\/(\d+)\/?$/);
    if (match) {
      const bookId = Number(match[1]);
      const title = $(elem).text().trim();
      if (title) {
        books.push({ bookId, title });
      }
    }
  });

  return {
    authorId,
    books,
  } as AuthorLibrary;
};
