import { fetchBooks } from "@services/fetchBooks/fetchBooks.service";
import {
  dataSync,
  saveSyncedBooks,
} from "@services/dataSync/dataSync.service";
import { printGreeting } from "@services/helpers/greeting";
import { sendMessage } from "@services/bookBot/send.message";
import { loadConfig } from "@services/config/config.service";
import { logger } from "@services/logger.service";
import { BookWithAuthor } from "@services/types/books.types";
import {
  handleCriticalError,
  logFetchFailures,
  processBook,
  toError,
} from "@services/helpers/processHelpers";

const main = async () => {
  printGreeting();
  const config = await loadConfig().catch((err: unknown) => {
    logger.error(toError(err));
    return null;
  });

  if (!config) {
    return;
  }

  try {
    const fetchBooksResult = await fetchBooks(config.books);
    logFetchFailures(fetchBooksResult.failed);

    const newBooks = await dataSync(fetchBooksResult.booksMap);
    if (!newBooks || newBooks.length === 0) {
      await sendMessage(null, config.telegram);
      return;
    }

    const syncedBooks: BookWithAuthor[] = [];

    for (const book of newBooks) {
      const syncedBook = await processBook(book, config.telegram);
      if (syncedBook) {
        syncedBooks.push(syncedBook);
      }
    }

    await saveSyncedBooks(syncedBooks);
  } catch (err: unknown) {
    await handleCriticalError(err, config.telegram);
  }
};

void main();
