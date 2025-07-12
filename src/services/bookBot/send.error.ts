import { TelegramConfig } from "../config/config.types";
import { logger } from "../logger.service";
import { Telegraf } from "telegraf";

export const sendError = async (
  error: Error,
  telegramConfig: TelegramConfig,
): Promise<void> => {
  const BOT_TOKEN = telegramConfig.bot_token;
  const CHAT_ID = telegramConfig.chat_id;

  if (!BOT_TOKEN) {
    logger.error("BOT_TOKEN не задан");
    return;
  }

  if (!CHAT_ID) {
    logger.error("CHAT_ID не задан");
    return;
  }

  // Инициализируем бот (не нужно вызывать bot.launch(), достаточно telegram API)
  const bot = new Telegraf(BOT_TOKEN);

  // Формируем текст сообщения
  const message = [
    `❗ *Произошла ошибка!*`,
    `*Тип:* ${error.name}`,
    `*Сообщение:* ${error.message}`,
    error.stack ? `*Стек:* \`\`\`${error.stack}\`\`\`` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    // Отправляем сообщение в чат
    await bot.telegram.sendMessage(CHAT_ID, message, {
      parse_mode: "Markdown",
    });
  } catch (sendErr) {
    // Логируем, если отправка не удалась
    logger.error("Не удалось отправить ошибку в Telegram", sendErr as Error);
  }
};
