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
  logFetchFailures,
  processBook,
  toError,
} from "@services/helpers/processHelpers";

const main = async () => {
  try {
    printGreeting();
    const config = await loadConfig();

    const fetchBooksResult = await fetchBooks(config.books);
    const hasFetchFailures = logFetchFailures(fetchBooksResult.failed);

    const newBooks = await dataSync(fetchBooksResult.booksMap);
    if (!newBooks || newBooks.length === 0) {
      if (!hasFetchFailures) {
        await sendMessage(null, config.telegram);
      }
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
    logger.error(toError(err));
  }
};

void main();
