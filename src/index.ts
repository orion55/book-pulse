import { logger } from "./services/logger.service";
import { loadSettings } from "./services/settings/settings.service";
import { fetchBooks } from "./services/fetchBooks/fetchBooks.service";
import { dataSync } from "./services/dataSync/dataSync.service";
import { printGreeting } from "./services/helpers/greeting";
import { getBooks } from "./services/getBooks/getBooks.service";
import { sendMessage } from "./services/bookBot/bookBot.service";

const main = async () => {
  try {
    printGreeting();
    const settings = loadSettings();
    const books = await fetchBooks(settings);
    const newBooks = await dataSync(books);
    const descBooks = await getBooks(newBooks);
    await sendMessage(descBooks);
  } catch (error) {
    logger.error(error);
  }
};

main();
