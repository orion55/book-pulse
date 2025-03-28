import { logger } from "./services/logger.service";
import { loadSettings } from "./services/settings/settings.service";
import { fetchBooks } from "./services/fetchBooks/fetchBooks.service";
import { dataSync } from "./services/dataSync/dataSync.service";
import { printGreeting } from "./services/helpers/greeting";

const main = async () => {
  try {
    printGreeting();
    const settings = loadSettings();
    const books = await fetchBooks(settings);
    const result = await dataSync(books);
    console.log(result);
  } catch (error) {
    logger.error(error);
  }
};

main();
