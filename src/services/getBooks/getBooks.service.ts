import { Book, DescBook } from "@services/types/books.types";
import { getDir } from "@services/helpers/pathUtils";
import fs from "fs";
import { ASSETS_PATH } from "@services/types/constants";
import { downloadBook } from "@services/getBooks/downloadBook";
import { logger } from "@services/logger.service";

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
      throw error;
    }
  }

  return descBooks;
};
