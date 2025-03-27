export type Book = {
  bookId: number;
  title: string;
};

export type BooksMap = Map<number, Book[]>;

export type AuthorLibrary = {
  authorId: number;
  books: Book[];
};
