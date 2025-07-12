import { Book, DescBook } from "../types/books.types";
import { getDir } from "../helpers/pathUtils";
import fs from "fs";
import { ASSETS_PATH } from "../types/constants";
import { downloadBook } from "./downloadBook";
import { logger } from "../logger.service";

export const getBooks = async (
  books: Book[] | null,
): Promise<DescBook[] | null> => {
  if (!books || books.length === 0) {
    return null;
  }

  const assetsDir = getDir(ASSETS_PATH);

  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  const descBooks: DescBook[] = [];

  for (const book of books) {
    try {
      const descBook = await downloadBook(book, assetsDir);
      descBooks.push(descBook);
    } catch (error) {
      logger.error(error);
    }
  }

  return descBooks;
};
