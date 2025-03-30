import { Book, DescBook } from "../types/books.types";
import { getDir } from "../settings/pathUtils";
import fs from "fs";
import { ASSETS_PATH } from "../types/constants";
import { downloadBook } from "./downloadBook";

export const getBooks = async (books: Book[]): Promise<DescBook[]> => {
  const assetsDir = getDir(ASSETS_PATH);

  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  const descBooks: DescBook[] = [];

  for (const book of books) {
    const descBook = await downloadBook(book, assetsDir);
    descBooks.push(descBook);
  }

  return descBooks;
};
