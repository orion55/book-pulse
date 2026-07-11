import {
  BooksMap,
  BookWithAuthor,
  SyncPlan,
} from "@services/types/books.types";
import { PrismaClient } from "@prisma/client";
import { logger } from "@services/logger.service";
import { addAuthorId } from "@services/dataSync/bookMappers";

interface StoredBook {
  id: number;
  authorId: number;
  bookId: number;
  title: string;
}

interface DataSyncClient {
  books: {
    findMany(args: { where: { authorId: number } }): Promise<StoredBook[]>;
  };
  $disconnect(): Promise<void>;
}

interface SaveSyncClient {
  $transaction<T>(operation: (tx: SaveSyncTransaction) => Promise<T>): Promise<T>;
  $disconnect(): Promise<void>;
}

interface SaveSyncTransaction {
  books: {
    deleteMany(args: {
      where: { id: { in: number[] } };
    }): Promise<unknown>;
    upsert(args: {
      where: {
        authorId_bookId: { authorId: number; bookId: number };
      };
      create: { authorId: number; bookId: number; title: string };
      update: { title: string };
    }): Promise<unknown>;
  };
}

export const dataSync = async (
  books: BooksMap,
  client?: DataSyncClient,
): Promise<SyncPlan> => {
  const prisma =
    client ?? (new PrismaClient() as unknown as DataSyncClient);
  const ownsClient = client === undefined;
  const newBooks: BookWithAuthor[] = [];
  const baselineBooks: BookWithAuthor[] = [];
  const bookIdsToRemove: number[] = [];

  try {
    for (const [authorId, parsedBooks] of books.entries()) {
      if (parsedBooks.length === 0) {
        logger.warn(
          `Синхронизация автора ${authorId} пропущена: список книг пуст`,
        );
        continue;
      }

      const dbBooks = await prisma.books.findMany({
        where: { authorId },
      });

      if (dbBooks.length === 0) {
        baselineBooks.push(...addAuthorId(authorId, parsedBooks));
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
          newBooks.push(...addAuthorId(authorId, booksToAdd));
        }

        if (booksToRemove.length > 0) {
          bookIdsToRemove.push(...booksToRemove.map((book) => book.id));
        }
      }
    }
  } catch (error) {
    logger.error("Ошибка при синхронизации книг:", error);
    throw error;
  } finally {
    if (ownsClient) {
      await prisma.$disconnect();
    }
  }

  return {
    newBooks,
    baselineBooks,
    bookIdsToRemove,
  };
};

export const saveSyncedBooks = async (
  books: BookWithAuthor[] | null,
  bookIdsToRemove: number[] = [],
  client?: SaveSyncClient,
): Promise<void> => {
  if ((!books || books.length === 0) && bookIdsToRemove.length === 0) {
    return;
  }

  const prisma =
    client ?? (new PrismaClient() as unknown as SaveSyncClient);
  const ownsClient = client === undefined;

  try {
    await prisma.$transaction(async (transaction) => {
      if (bookIdsToRemove.length > 0) {
        await transaction.books.deleteMany({
          where: { id: { in: bookIdsToRemove } },
        });
      }

      for (const book of books ?? []) {
        await transaction.books.upsert({
          where: {
            authorId_bookId: {
              authorId: book.authorId,
              bookId: book.bookId,
            },
          },
          create: {
            authorId: book.authorId,
            bookId: book.bookId,
            title: book.title,
          },
          update: { title: book.title },
        });
      }
    });
  } catch (error) {
    logger.error("Ошибка при сохранении отправленных книг:", error);
    throw error;
  } finally {
    if (ownsClient) {
      await prisma.$disconnect();
    }
  }
};
