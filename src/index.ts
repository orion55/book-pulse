import { logger } from "./services/logger.service";
import { loadSettings } from "./services/settings/settings.service";
import { fetchBooks } from "./services/fetchBooks/fetchBooks.service";
import { dataSync } from "./services/dataSync/dataSync.service";
import { printGreeting } from "./services/helpers/greeting";
import { Book } from "./services/types/books.types";
import { getBooks } from "./services/getBooks/getBooks.service";

const IS_DEBUG = true;

const main = async () => {
  try {
    printGreeting();
    const settings = loadSettings();
    const books = await fetchBooks(settings);
    const newBooks = await dataSync(books);
    console.log({ newBooks });
    if (IS_DEBUG) {
      const newBooks2: Book[] = [
        { bookId: 800137, title: "Дон Алехандро и его башня" },
        { bookId: 747553, title: "Чудовища" },
      ];
      const descBooks = await getBooks(newBooks2);
      console.log(descBooks);
    }
  } catch (error) {
    logger.error(error);
  }
};

main();
