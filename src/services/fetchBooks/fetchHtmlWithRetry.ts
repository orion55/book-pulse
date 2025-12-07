import { logger } from "../logger.service";

export type DownloadResult =
  | { ok: true; html: string; attempts: number }
  | { ok: false; attempts: number; errorMessage: string };

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const FILTER = "?lang=__&order=a&hg1=1&hg=1&sa1=1&hr1=1&rd1=1";
const FETCH_TIMEOUT_MS = 7000;

/**
 * Загружает HTML с прогрессивной задержкой и логированием ошибок.
 * Попытки: 1 + maxRetries.
 */
export const fetchHtmlWithRetry = async (
  url: string,
  maxRetries = 3,
  baseDelayMs = 500,
): Promise<DownloadResult> => {
  const attemptsTotal = maxRetries + 1;

  for (let attempt = 1; attempt <= attemptsTotal; attempt++) {
    logger.info(`Загружаем ${url} (попытка ${attempt}/${attemptsTotal})`);

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const response = await fetch(url + FILTER, {
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      return { ok: true, html, attempts: attempt };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : String(err ?? "Unknown error");

      logger.warn(`Ошибка при загрузке ${url}: ${message}`);

      if (attempt === attemptsTotal) {
        logger.error(
          `Файл ${url} не удалось скачать после ${attempt} попыток.`,
        );
        return { ok: false, attempts: attempt, errorMessage: message };
      }

      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      logger.info(`Повторная попытка через ${delay} мс`);
      await sleep(delay);
    }
  }

  return {
    ok: false,
    attempts: attemptsTotal,
    errorMessage: "Неизвестная ошибка",
  };
};
