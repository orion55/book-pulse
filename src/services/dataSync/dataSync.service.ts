import { Book, BooksMap } from "../fetchBooks/fetchBooks.types";
import { PrismaClient } from "@prisma/client";
import { logger } from "../logger.service";

const prisma = new PrismaClient();

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
        const dbBookIds = new Set(dbBooks.map((b) => b.bookId));
        const parsedBookIds = new Set(parsedBooks.map((b) => b.bookId));

        const booksToAdd = parsedBooks.filter((b) => !dbBookIds.has(b.bookId));
        const booksToRemove = dbBooks.filter(
          (b) => !parsedBookIds.has(b.bookId),
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
