export type Book = {
  bookId: number;
  title: string;
};

export type BooksMap = Map<number, Book[]>;

export type AuthorLibrary = {
  authorId: number;
  authorName: string;
  books: Book[];
};

export type DescBook = {
  authors: string[];
  title: string;
  annotation: string;
  image: string;
  url: string;
};

export type FailedUrl = {
  url: string;
  reason: string;
  attempts: number;
};

export type FetchBooksResult = {
  booksMap: BooksMap;
  failed: FailedUrl[];
};
