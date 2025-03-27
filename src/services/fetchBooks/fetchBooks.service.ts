import { Book, BooksMap } from "./fetchBooks.types";
import { parseBooks } from "./parseBooks";

export const fetchBooks = async (settings: string[]): Promise<BooksMap> => {
  const booksMap: BooksMap = new Map<number, Book[]>();

  for (const url of settings) {
    const authorLibrary = await parseBooks(url);
    const { authorId, books } = authorLibrary;
    booksMap.set(authorId, books);
  }

  return booksMap;
};
