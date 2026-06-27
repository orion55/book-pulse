import { sendMessage } from "../bookBot/send.message";
import { TelegramConfig } from "../config/config.types";
import { getBooks } from "../getBooks/getBooks.service";
import { logger } from "../logger.service";
import { BookWithAuthor, FailedUrl } from "../types/books.types";
import { formatFetchFailures } from "./formatFetchFailures";

export const toError = (err: unknown) =>
  err instanceof Error ? err : new Error(String(err));

export const logFetchFailures = (failed: FailedUrl[]) => {
  if (failed.length === 0) {
    return false;
  }

  logger.error(
    new Error(
      "Не удалось загрузить часть URL, доступные книги будут обработаны:\n" +
        formatFetchFailures(failed),
    ),
  );

  return true;
};

export const processBook = async (
  book: BookWithAuthor,
  telegram: TelegramConfig,
): Promise<BookWithAuthor | null> => {
  try {
    const descBooks = await getBooks([book]);
    await sendMessage(descBooks, telegram);
    return book;
  } catch (err: unknown) {
    const error = toError(err);
    logger.error(
      new Error(
        `Не удалось обработать книгу "${book.title}" (${book.bookId}): ${error.message}`,
      ),
    );
    return null;
  }
};
