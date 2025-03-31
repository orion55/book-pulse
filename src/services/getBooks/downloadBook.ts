import { Book, DescBook } from "../types/books.types";
import * as cheerio from "cheerio";
import * as path from "path";
import { logger } from "../logger.service";
import { downloadAndSave } from "./utils";

const FLIBUSTA_URL = "http://flibusta.is";
const BOOK_URL = `${FLIBUSTA_URL}/b`;

export const downloadBook = async (
  book: Book,
  assetsDir: string,
): Promise<DescBook> => {
  const bookUrl = BOOK_URL + "/" + book.bookId;
  logger.info(`Скачиваем книгу ${bookUrl}`);
  const $ = await cheerio.fromURL(bookUrl);

  const titleHeader = $("h1.title");
  const rawTitle = titleHeader.first().text().trim();
  const title = rawTitle.replace(/\s*\(fb2\)\s*/i, "");

  const authors: string[] = [];
  titleHeader.nextAll('a[href^="/a/"]').each((_, el) => {
    const authorName = $(el).text().trim();
    if (authorName) {
      authors.push(authorName);
    }
  });

  let annotation = "";
  const annotationHeader = $("h2")
    .filter((_, el) => $(el).text().trim() === "Аннотация")
    .first();
  if (annotationHeader.length > 0) {
    const annotationElements = annotationHeader.nextUntil("h2, hr");
    annotation = annotationElements
      .map((_, el) => $(el).text())
      .get()
      .join(" ")
      .trim()
      .replace(/\s+/g, " ");
  }

  let imageLocalPath = "";
  const imageElement = $('img[alt="Cover image"]').first();
  if (imageElement.length > 0) {
    let imageUrl = imageElement.attr("src") || "";
    if (imageUrl.startsWith("/")) {
      imageUrl = `${FLIBUSTA_URL}${imageUrl}`;
    }
    if (imageUrl) {
      const imageFilename = path.basename(imageUrl);
      imageLocalPath = await downloadAndSave(
        imageUrl,
        assetsDir,
        imageFilename,
      );
    }
  }

  if (authors.length === 0 && annotation === "" && imageLocalPath === "") {
    throw new Error(
      `Не получены необходимые данные: отсутствуют авторы, аннотация и изображение. ${bookUrl}\n`,
    );
  }

  return {
    authors,
    title,
    annotation,
    image: imageLocalPath,
    url: bookUrl,
  } as DescBook;
};
