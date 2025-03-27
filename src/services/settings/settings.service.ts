import * as fs from "fs";
import * as path from "path";
import { getDir } from "./pathUtils";

const SETTING_FILE = "books.txt";

const loadSettings = (): string[] => {
  const settingDir = getDir("");
  const settingsPath = path.join(settingDir, SETTING_FILE);

  if (!fs.existsSync(settingsPath)) {
    throw new Error(`Файл настроек не найден: ${settingsPath}`);
  }

  const settingsContent = fs.readFileSync(settingsPath, "utf8");
  const settings = settingsContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (settings.length === 0) {
    throw new Error("Файл настроек пуст");
  }

  return settings;
};

export { loadSettings };
