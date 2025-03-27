import { printGreeting } from "./services/helpers/greeting";
import { logger } from "./services/logger.service";
import { loadSettings } from "./services/settings/settings.service";
import { fetchBooks } from "./services/fetchBooks/fetchBooks.service";

const main = async () => {
  try {
    printGreeting();
    const settings = loadSettings();
    const books = await fetchBooks(settings);
    console.log(books);
  } catch (error) {
    logger.error(error);
  }
};

main();
