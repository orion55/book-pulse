export type Book = {
  bookId: number;
  title: string;
};

export type BooksMap = Map<number, Book[]>;

export type AuthorLibrary = {
  authorId: number;
  books: Book[];
};

export type DescBook = {
  authors: string[];
  title: string;
  annotation: string;
  image: string;
  url: string;
};
