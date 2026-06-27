import { Book, BookWithAuthor } from "@services/types/books.types";

export const mapBookData = (authorId: number, booksArray: Book[]) =>
  booksArray.map((book) => ({
    authorId,
    bookId: book.bookId,
    title: book.title,
  }));

export const addAuthorId = (
  authorId: number,
  books: Book[],
): BookWithAuthor[] => books.map((book) => ({ ...book, authorId }));
