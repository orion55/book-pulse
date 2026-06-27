import { logger } from "@services/logger.service";
import colors from "ansi-colors";
import fs from "fs";

const MARKDOWN_ESCAPE_CHARS = new Set(["\\", "_", "*", "`", "[", "]"]);

export const escapeMarkdown = (text: string): string =>
  Array.from(text)
    .map((char) => (MARKDOWN_ESCAPE_CHARS.has(char) ? `\\${char}` : char))
    .join("");

export const hasReadableImage = async (
  imagePath: string,
): Promise<boolean> => {
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

export const removeImage = async (imagePath: string): Promise<void> => {
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
