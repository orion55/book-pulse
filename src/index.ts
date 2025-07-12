import { logger } from "./services/logger.service";
import { fetchBooks } from "./services/fetchBooks/fetchBooks.service";
import { dataSync } from "./services/dataSync/dataSync.service";
import { printGreeting } from "./services/helpers/greeting";
import { getBooks } from "./services/getBooks/getBooks.service";
import { sendMessage } from "./services/bookBot/send.message";
import { loadConfig } from "./services/config/config.service";
import { sendError } from "./services/bookBot/send.error";

const main = async () => {
  let config;
  try {
    printGreeting();
    config = await loadConfig();
    const books = await fetchBooks(config.books);
    const newBooks = await dataSync(books);
    const descBooks = await getBooks(newBooks);
    await sendMessage(descBooks, config.telegram);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error(error);
    await sendError(error, config?.telegram!);
  }
};

main();
