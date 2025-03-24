import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const SETTING_FILE = "book.txt";

const loadSettings = (): string[] => {
  const rootDir = path.dirname(fileURLToPath(import.meta.url));

  const settingDir =
    process.env.NODE_ENV === "development"
      ? path.join(rootDir, "../..")
      : rootDir;

  const settingsPath = path.join(settingDir, SETTING_FILE);
  const settingsContent = fs.readFileSync(settingsPath, "utf8");

  return settingsContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
};

export { loadSettings };
