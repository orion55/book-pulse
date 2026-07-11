import { sendMessage } from "@services/bookBot/send.message";
import { TelegramConfig } from "@services/config/config.types";
import { getBooks } from "@services/getBooks/getBooks.service";
import { logger } from "@services/logger.service";
import { BookWithAuthor, FailedUrl } from "@services/types/books.types";
import { formatFetchFailures } from "@services/helpers/formatFetchFailures";
import { sendErrorMessage } from "@services/bookBot/send.error";

export const toError = (err: unknown) =>
  err instanceof Error ? err : new Error(String(err));

interface CriticalErrorEffects {
  logError: (error: Error) => void;
  sendError: typeof sendErrorMessage;
}

const defaultCriticalErrorEffects: CriticalErrorEffects = {
  logError: (error) => logger.error(error),
  sendError: sendErrorMessage,
};

export const handleCriticalError = async (
  err: unknown,
  telegram: TelegramConfig,
  effects: CriticalErrorEffects = defaultCriticalErrorEffects,
): Promise<void> => {
  effects.logError(toError(err));

  try {
    await effects.sendError(telegram);
  } catch (notificationError: unknown) {
    const error = toError(notificationError);
    effects.logError(
      new Error(
        `Не удалось отправить сообщение о критической ошибке: ${error.message}`,
      ),
    );
  }
};

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
