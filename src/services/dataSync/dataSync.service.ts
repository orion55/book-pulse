import { Book, BooksMap } from "../types/books.types";
import { logger } from "../logger.service";
import { PrismaBetterSQLite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaBetterSQLite3({
  url: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

export const dataSync = async (books: BooksMap): Promise<Book[] | null> => {
  const newBooks: Book[] = [];

  const mapBookData = (authorId: number, booksArray: Book[]) =>
    booksArray.map((book) => ({
      authorId,
      bookId: book.bookId,
      title: book.title,
    }));

  try {
    for (const [authorId, parsedBooks] of books.entries()) {
      const dbBooks = await prisma.books.findMany({
        where: { authorId },
      });

      if (dbBooks.length === 0) {
        await prisma.books.createMany({
          data: mapBookData(authorId, parsedBooks),
        });
      } else {
        const dbBookIds = new Set(dbBooks.map((book) => book.bookId));
        const parsedBookIds = new Set(parsedBooks.map((book) => book.bookId));

        const booksToAdd = parsedBooks.filter(
          (book) => !dbBookIds.has(book.bookId),
        );
        const booksToRemove = dbBooks.filter(
          (book) => !parsedBookIds.has(book.bookId),
        );

        if (booksToAdd.length > 0) {
          await prisma.books.createMany({
            data: mapBookData(authorId, booksToAdd),
          });
          newBooks.push(...booksToAdd);
        }

        if (booksToRemove.length > 0) {
          await Promise.all(
            booksToRemove.map((book) =>
              prisma.books.delete({
                where: { id: book.id },
              }),
            ),
          );
        }
      }
    }
  } catch (error) {
    logger.error("Ошибка при синхронизации книг:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }

  return newBooks.length > 0 ? newBooks : null;
};
