import { TelegramConfig } from "@services/config/config.types";
import { Telegraf } from "telegraf";

const CRITICAL_ERROR_MESSAGE =
  "⚠️ Проверка новых книг завершилась с критической ошибкой. Подробности записаны в журнал.";

export const sendErrorMessage = async (
  telegramConfig: TelegramConfig,
): Promise<void> => {
  const botToken = telegramConfig.bot_token;
  const chatId = telegramConfig.chat_id;

  if (!botToken) {
    throw new Error("BOT_TOKEN не задан");
  }

  if (!Number.isFinite(chatId) || chatId === 0) {
    throw new Error("CHAT_ID не задан или некорректен");
  }

  const bot = new Telegraf(botToken);
  await bot.telegram.sendMessage(chatId, CRITICAL_ERROR_MESSAGE);
};
