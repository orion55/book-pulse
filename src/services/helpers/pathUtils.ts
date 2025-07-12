import path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const __dirname = path.resolve(); // путь к текущей рабочей директории

export function getDir(baseFolder: string): string {
  return process.env.NODE_ENV === "development"
    ? path.join(__dirname, "src", baseFolder) // если запускаешь из исходников
    : path.join(__dirname, baseFolder); // если запускаешь из dist
}
