import { DescBook } from "../types/books.types";
import { logger } from "../logger.service";
import { Telegraf } from "telegraf";
import fs from "fs";
import colors from "ansi-colors";

export const sendMessage = async (books: DescBook[] | null): Promise<void> => {
  const BOT_TOKEN = process.env.BOT_TOKEN;
  const CHAT_ID = process.env.CHAT_ID;

  if (!BOT_TOKEN) {
    logger.error("BOT_TOKEN не задан");
    return;
  }

  if (!CHAT_ID) {
    logger.error("CHAT_ID не задан");
    return;
  }

  const bot = new Telegraf(BOT_TOKEN);

  try {
    if (!books || books.length === 0) {
      const currentDate = new Date().toLocaleDateString("ru-RU");
      const message = `*${currentDate}* Новых книг пока нет\n\n`;
      await bot.telegram.sendMessage(CHAT_ID, message, {
        parse_mode: "Markdown",
      });
      logger.info(
        `Сообщение «${colors.green("Новых книг пока нет")}» было отправлено`,
      );
      return;
    }

    for (const book of books) {
      const authorsString = book.authors.join(", ");
      const message =
        `*${book.title}*\n\n` +
        `*Автор(ы):* ${authorsString}\n\n` +
        `*Аннотация:*\n${book.annotation}\n\n` +
        `*Скачать:*\n${book.url}\n\n`;

      try {
        const photoStream = fs.createReadStream(book.image);
        await bot.telegram.sendPhoto(
          CHAT_ID,
          { source: photoStream },
          { caption: message, parse_mode: "Markdown" },
        );
        logger.info(`Сообщение ${colors.green(book.title)} было отправлено`);

        try {
          await fs.promises.unlink(book.image);
          logger.info(`Файл обложки ${colors.green(book.image)} удален`);
        } catch (unlinkError) {
          logger.error(
            `Ошибка при удалении файла обложки ${book.image}:`,
            unlinkError,
          );
        }
      } catch (error) {
        logger.error("Ошибка при отправке книги:", error);
      }
    }
  } catch (error) {
    logger.error("Ошибка при отправке сообщения:", error);
  }
};
