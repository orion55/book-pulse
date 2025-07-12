import { AppConfig } from "./config.types";
import path from "path";
import { getDir } from "../helpers/pathUtils";
import { promises as fs } from "fs";
import { parse } from "yaml";

export async function loadConfig(): Promise<AppConfig> {
  const configPath = path.join(getDir(""), "config.yml");
  try {
    const fileContents = await fs.readFile(configPath, "utf8");

    const parsed = parse(fileContents);

    let books: string[] = [];
    if (parsed.books !== undefined) {
      if (Array.isArray(parsed.books)) {
        books = parsed.books.map((item: any) => String(item));
      } else {
        books = [String(parsed.books)];
      }
    }

    return {
      telegram: {
        bot_token: String(parsed.telegram.bot_token),
        chat_id: Number(parsed.telegram.chat_id),
      },
      books,
    };
  } catch (err) {
    throw new Error(
      `Не удалось прочитать файл конфига по пути "${configPath}": ${err instanceof Error ? err.message : err}`,
    );
  }
}
