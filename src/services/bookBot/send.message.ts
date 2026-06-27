import { DescBook } from "@services/types/books.types";
import { logger } from "@services/logger.service";
import { Telegraf } from "telegraf";
import fs from "fs";
import colors from "ansi-colors";
import truncate from "lodash/truncate";
import { TelegramConfig } from "@services/config/config.types";
import { MAX_ANNOTATION_LENGTH } from "@services/bookBot/bookBot.constants";

const hasReadableImage = async (imagePath: string): Promise<boolean> => {
  if (!imagePath) {
    return false;
  }

  try {
    const stats = await fs.promises.stat(imagePath);
    await fs.promises.access(imagePath, fs.constants.R_OK);
    return stats.isFile();
  } catch {
    return false;
  }
};

const removeImage = async (imagePath: string) => {
  if (!imagePath) {
    return;
  }

  try {
    await fs.promises.unlink(imagePath);
    logger.info(`Файл обложки ${colors.green(imagePath)} удален`);
  } catch (unlinkError) {
    logger.error(
      `Ошибка при удалении файла обложки ${imagePath}:`,
      unlinkError,
    );
  }
};

export const sendMessage = async (
  books: DescBook[] | null,
  telegramConfig: TelegramConfig,
): Promise<void> => {
  const BOT_TOKEN = telegramConfig.bot_token;
  const CHAT_ID = telegramConfig.chat_id;

  if (!BOT_TOKEN) {
    throw new Error("BOT_TOKEN не задан");
  }

  if (!Number.isFinite(CHAT_ID) || CHAT_ID === 0) {
    throw new Error("CHAT_ID не задан или некорректен");
  }

  const bot = new Telegraf(BOT_TOKEN);

  if (!books || books.length === 0) {
    const currentDate = new Date().toLocaleDateString("ru-RU");
    const message = `*${currentDate}* 📚 Новых книг пока нет 📚 \n\n`;
    await bot.telegram.sendMessage(CHAT_ID, message, {
      parse_mode: "Markdown",
    });
    logger.info(
      `Сообщение ${colors.green("Новых книг пока нет")} было отправлено`,
    );
    return;
  }

  for (const book of books) {
    const authorsString = book.authors.join(", ");
    const annotation = truncate(book.annotation, {
      length: MAX_ANNOTATION_LENGTH,
    });
    const message =
      `*${book.title}*\n\n` +
      `*Автор(ы):* ${authorsString}\n\n` +
      `*Аннотация:*\n${annotation}\n\n` +
      `*Скачать:*\n${book.url}\n\n`;

    try {
      const shouldSendPhoto = await hasReadableImage(book.image);
      if (shouldSendPhoto) {
        const photoStream = fs.createReadStream(book.image);
        photoStream.on("error", (streamError) => {
          logger.error(
            `Ошибка при чтении файла обложки ${book.image}:`,
            streamError,
          );
        });

        await bot.telegram.sendPhoto(CHAT_ID, { source: photoStream });
        logger.info(`Файл обложки ${colors.green(book.image)} был отправлен`);
      } else {
        logger.warn(
          `Обложка для книги ${colors.green(book.title)} отсутствует, отправляем только текст`,
        );
      }

      await bot.telegram.sendMessage(CHAT_ID, message, {
        parse_mode: "Markdown",
      });
      logger.info(`Сообщение ${colors.green(book.title)} было отправлено`);

      if (shouldSendPhoto) {
        await removeImage(book.image);
      }
    } catch (error) {
      logger.error("Ошибка при отправке книги:", error);
      throw error;
    }
  }
};
