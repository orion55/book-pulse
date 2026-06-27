import { AppConfig } from "@services/config/config.types";
import path from "path";
import { getDir } from "@services/helpers/pathUtils";
import { promises as fs } from "fs";
import { parse } from "yaml";
import {
  formatConfigError,
  parseConfig,
} from "@services/config/config.validator";

export async function loadConfig(): Promise<AppConfig> {
  const configPath = path.join(getDir(""), "config.yml");
  try {
    const fileContents = await fs.readFile(configPath, "utf8");

    const parsed: unknown = parse(fileContents);
    return parseConfig(parsed);
  } catch (err) {
    throw new Error(
      `Не удалось прочитать или разобрать файл конфига по пути "${configPath}": ${formatConfigError(err)}`,
    );
  }
}
