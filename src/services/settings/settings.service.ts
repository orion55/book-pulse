import * as fs from "fs";
import * as path from "path";
import { getDir } from "./pathUtils";

const SETTING_FILE = "book.txt";

const loadSettings = (): string[] => {
  const settingDir = getDir("");

  const settingsPath = path.join(settingDir, SETTING_FILE);
  const settingsContent = fs.readFileSync(settingsPath, "utf8");

  return settingsContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
};

export { loadSettings };
